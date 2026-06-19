#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 8 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR CPYTHON_WASM PY_CYTHON CYSIGNALS_WASI_SDK PARI_WASI_SDK POSIX_WASI_SDK" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
cpython_wasm="$(cd "$4" && pwd)"
py_cython="$(cd "$5" && pwd)"
cysignals_wasi_sdk="$(cd "$6" && pwd)"
pari_wasi_sdk="$(cd "$7" && pwd)"
posix_wasi_sdk="$(cd "$8" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "cypari2" wasi-sdk "$bin_dir" "$probe_dir"

python_include="$cpython_wasm/include/python3.14"
extension_suffix=".cpython-314-wasm32-wasi.so"

rm -rf "$dist_dir"
mkdir -p "$dist_dir/cypari2" "$probe_dir/bin"

cat >"$probe_dir/bin/gphelp" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [ "${1:-}" = "-raw" ]; then
  exit 0
fi
echo "cypari2 build-support gphelp stub only implements -raw" >&2
exit 1
EOF
chmod +x "$probe_dir/bin/gphelp"

PATH="$probe_dir/bin:$PATH" python3 - <<PY
import sys
sys.path.insert(0, "$build_dir")
from autogen import rebuild
rebuild("$pari_wasi_sdk/share/pari", force=True, output="$probe_dir/generated/cypari2")
PY

cp \
  "$build_dir/cypari2/"*.pxd \
  "$build_dir/cypari2/cypari.h" \
  "$build_dir/cypari2/pycore_long.h" \
  "$probe_dir/generated/cypari2/auto_paridecl.pxd" \
  "$probe_dir/generated/cypari2/auto_gen.pxi" \
  "$probe_dir/generated/cypari2/auto_instance.pxi" \
  "$dist_dir/cypari2/"

cat >"$dist_dir/cypari2/__init__.py" <<'PY'
"""CoWasm build-support stub for cypari2.

The full cypari2 runtime extension modules are not ported yet. This package
exists so Sagelite's build can locate cypari2's Cython include files and import
the minimal ABI-compatible cypari2.gen placeholder.
"""

__version__ = "2.2.4"
BUILD_SUPPORT_ONLY = True

from .gen import Gen, objtogen
from .handle_error import PariError
from .pari_instance import Pari
PY

cat >"$dist_dir/cypari2/cypari2.py" <<'PY'
includedir = __import__("pathlib").Path(__file__).parent

Name = "cypari2"
Description = "cypari2 build-support include surface"
Version = "2.2.4"
Cflags = f"-I{includedir}"
PY

cat >"$probe_dir/gen.pyx" <<'PYX'
"""Import-time placeholder extension for cypari2.gen.

This is not a PARI runtime. It only gives Sagelite modules ABI-compatible
``Gen`` extension types to import until CoWasm has a real compiled cypari2
port.
"""

from .types cimport GEN


def _missing_runtime(*_args, **_kwargs):
    raise NotImplementedError(
        "CoWasm cypari2 is build-support only; the compiled PARI runtime is not ported yet"
    )


cdef class Gen_base:
    pass


cdef class Gen(Gen_base):
    def __init__(self, value=None):
        pass

    def __getattr__(self, _name):
        return _missing_runtime

    cdef Gen new_ref(self, GEN g):
        _missing_runtime()

    cdef GEN fixGEN(self) except NULL:
        _missing_runtime()

    cdef GEN ref_target(self) except NULL:
        _missing_runtime()


cpdef Gen objtogen(s):
    _missing_runtime()


cdef Gen list_of_Gens_to_Gen(list s):
    _missing_runtime()
PYX

PYTHONPATH="$py_cython" python3 -m cython -3 \
  --module-name cypari2.gen \
  -I "$dist_dir" \
  -I "$dist_dir/cypari2" \
  -I "$pari_wasi_sdk/include" \
  --output-file "$probe_dir/gen.c" \
  "$probe_dir/gen.pyx"

"$bin_dir/wasi-sdk-clang-next" -target wasm32-wasip1 \
  -O0 \
  -fPIC \
  -D_SCHED_H \
  -shared \
  -nostdlib \
  -Wl,--allow-undefined \
  -Wl,--no-entry \
  -Wl,--export=PyInit_gen \
  -I"$python_include" \
  -I"$dist_dir/cypari2" \
  -I"$posix_wasi_sdk" \
  -I"$pari_wasi_sdk/include" \
  "$probe_dir/gen.c" \
  -o "$dist_dir/cypari2/gen$extension_suffix"

"$bin_dir/wasi-sdk-llvm-objdump-next" -h "$dist_dir/cypari2/gen$extension_suffix" |
  grep 'dylink\.0'
"$bin_dir/wasi-sdk-llvm-nm-next" "$dist_dir/cypari2/gen$extension_suffix" |
  grep ' T PyInit_gen$'

cat >"$dist_dir/cypari2/handle_error.py" <<'PY'
"""Import-time placeholder for cypari2.handle_error."""


class PariError(RuntimeError):
    pass
PY

cat >"$dist_dir/cypari2/pari_instance.py" <<'PY'
"""Import-time placeholder for cypari2.pari_instance."""

from .gen import _missing_runtime


class Pari:
    def __init__(self, stack_initial=None, stack_max=None):
        self.stack_initial = stack_initial
        self.stack_max = stack_max

    def default(self, _key, value=None):
        if value is None:
            _missing_runtime()
        return None

    def __call__(self, *args, **kwargs):
        return _missing_runtime(*args, **kwargs)

    def __getattr__(self, _name):
        return _missing_runtime


def get_var(*args, **kwargs):
    return _missing_runtime(*args, **kwargs)
PY

cat >"$probe_dir/cypari2_cimport_probe.pyx" <<'PYX'
from cypari2.gen cimport Gen
from cypari2.pari_instance cimport Pari
from cypari2.paridecl cimport GEN, stoi

cdef GEN make_gen(long n):
    return stoi(n)

cdef class UsesCypari2Declarations:
    cdef Gen value
    cdef Pari pari
PYX

PYTHONPATH="$py_cython:$cysignals_wasi_sdk" python3 -m cython -3 \
  -I "$dist_dir" \
  -I "$dist_dir/cypari2" \
  -I "$pari_wasi_sdk/include" \
  --output-file "$probe_dir/cypari2_cimport_probe.c" \
  "$probe_dir/cypari2_cimport_probe.pyx"

PYTHONPATH="$dist_dir" "$bin_dir/python-wasm" - <<'PY'
import cypari2
from cypari2.gen import Gen, Gen_base, objtogen
from cypari2.handle_error import PariError
from cypari2.pari_instance import Pari

assert cypari2.__version__ == "2.2.4"
assert cypari2.BUILD_SUPPORT_ONLY is True
assert cypari2.__file__.endswith("__init__.py")
assert Gen.__module__ == "cypari2.gen"
assert Gen_base.__module__ == "cypari2.gen"
assert issubclass(Gen, Gen_base)
assert issubclass(PariError, RuntimeError)
assert isinstance(Gen(1), Gen_base)
assert Pari(1, 2).default("debugmem", 0) is None
for constructor in (lambda: objtogen(1), Pari().__call__, Gen().__getattr__("factor")):
    try:
        constructor()
    except NotImplementedError:
        pass
    else:
        raise AssertionError(f"{constructor!r} did not fail closed")
PY

echo "cypari2-build-support-ok generated-pari-declarations cython-cimport-probe runtime-placeholders"
