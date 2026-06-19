#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 7 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR CPYTHON_WASM PY_CYTHON CYSIGNALS_WASI_SDK PARI_WASI_SDK" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
cpython_wasm="$(cd "$4" && pwd)"
py_cython="$(cd "$5" && pwd)"
cysignals_wasi_sdk="$(cd "$6" && pwd)"
pari_wasi_sdk="$(cd "$7" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "cypari2" wasi-sdk "$bin_dir" "$probe_dir"

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

The compiled cypari2 runtime extension modules are not ported yet. This package
exists so Sagelite's build can locate cypari2's Cython include files.
"""

__version__ = "2.2.4"
BUILD_SUPPORT_ONLY = True
PY

cat >"$dist_dir/cypari2/cypari2.py" <<'PY'
includedir = __import__("pathlib").Path(__file__).parent

Name = "cypari2"
Description = "cypari2 build-support include surface"
Version = "2.2.4"
Cflags = f"-I{includedir}"
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

assert cypari2.__version__ == "2.2.4"
assert cypari2.BUILD_SUPPORT_ONLY is True
assert cypari2.__file__.endswith("__init__.py")
PY

echo "cypari2-build-support-ok generated-pari-declarations cython-cimport-probe"
