#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 9 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR CPYTHON_WASM PY_CYTHON CYSIGNALS_WASI_SDK PARI_WASI_SDK GMP_WASI_SDK POSIX_WASI_SDK" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
cpython_wasm="$(cd "$4" && pwd)"
py_cython="$(cd "$5" && pwd)"
cysignals_wasi_sdk="$(cd "$6" && pwd)"
pari_wasi_sdk="$(cd "$7" && pwd)"
gmp_wasi_sdk="$(cd "$8" && pwd)"
posix_wasi_sdk="$(cd "$9" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "cypari2" wasi-sdk "$bin_dir" "$probe_dir"

python_include="$cpython_wasm/include/python3.14"
extension_suffix=".cpython-314-wasm32-wasi.so"

assert_wasm_imports_memory() {
  local module_path="$1"
  python3 - "$module_path" <<'PY'
import sys
from pathlib import Path


def read_uleb(data, offset):
    result = 0
    shift = 0
    while True:
        byte = data[offset]
        offset += 1
        result |= (byte & 0x7F) << shift
        if byte & 0x80 == 0:
            return result, offset
        shift += 7


def read_name(data, offset):
    size, offset = read_uleb(data, offset)
    return data[offset:offset + size].decode(), offset + size


def imports_memory(path):
    data = path.read_bytes()
    if data[:4] != b"\0asm":
        return False
    offset = 8
    while offset < len(data):
        section_id = data[offset]
        offset += 1
        section_size, offset = read_uleb(data, offset)
        section_end = offset + section_size
        if section_id != 2:
            offset = section_end
            continue
        import_count, offset = read_uleb(data, offset)
        for _ in range(import_count):
            _, offset = read_name(data, offset)
            _, offset = read_name(data, offset)
            kind = data[offset]
            offset += 1
            if kind == 0:
                _, offset = read_uleb(data, offset)
            elif kind == 1:
                offset += 1
                flags, offset = read_uleb(data, offset)
                _, offset = read_uleb(data, offset)
                if flags & 1:
                    _, offset = read_uleb(data, offset)
            elif kind == 2:
                return True
            elif kind == 3:
                offset += 2
            else:
                return False
        return False
    return False


module = Path(sys.argv[1])
if not imports_memory(module):
    raise SystemExit(f"{module}: missing imported memory")
PY
}

audit_cpython_side_module() {
  local module_path="$1"
  local pyinit_symbol="$2"
  "$bin_dir/wasi-sdk-llvm-objdump-next" -h "$module_path" |
    grep 'dylink\.0'
  "$bin_dir/wasi-sdk-llvm-nm-next" "$module_path" |
    grep " T ${pyinit_symbol}$"
  assert_wasm_imports_memory "$module_path"
  if "$bin_dir/wasi-sdk-llvm-strings-next" "$module_path" |
      grep -Fx 'needed_dynlibs'; then
    echo "$module_path records needed_dynlibs" >&2
    exit 1
  fi
}

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

audit_cpython_side_module "$dist_dir/cypari2/gen$extension_suffix" PyInit_gen

cat >"$probe_dir/pari_runtime_probe.c" <<'EOF'
#include <Python.h>
#include <pari/pari.h>
#include <stdio.h>

static int pari_initialized = 0;

static void ensure_pari(void) {
  if (!pari_initialized) {
    pari_init(8000000, 2);
    pari_initialized = 1;
  }
}

static PyObject *eval_long(PyObject *self, PyObject *args) {
  const char *expression;
  GEN value;

  (void)self;
  if (!PyArg_ParseTuple(args, "s", &expression)) {
    return NULL;
  }

  ensure_pari();
  value = gp_read_str(expression);
  return PyLong_FromLong(itos(value));
}

static PyObject *check_error_recovery(PyObject *self,
                                      PyObject *Py_UNUSED(ignored)) {
  int caught_inverse_error = 0;
  GEN value;
  long result;
  char message[64];

  (void)self;
  ensure_pari();

  pari_CATCH(e_INV) {
    GEN error = pari_err_last();
    caught_inverse_error = error && err_get_num(error) == e_INV;
  }
  pari_TRY {
    (void)gp_read_str("1/0");
  }
  pari_ENDCATCH;

  if (!caught_inverse_error) {
    PyErr_SetString(PyExc_RuntimeError,
                    "PARI inverse error was not caught as e_INV");
    return NULL;
  }

  value = gp_read_str("13*17");
  result = itos(value);
  snprintf(message, sizeof(message), "caught=e_INV recovered=%ld", result);
  return PyUnicode_FromString(message);
}

static PyMethodDef methods[] = {
    {"eval_long", eval_long, METH_VARARGS,
     "Evaluate a PARI expression as a C long."},
    {"check_error_recovery", check_error_recovery, METH_NOARGS,
     "Check PARI error recovery and a later computation."},
    {NULL, NULL, 0, NULL},
};

static struct PyModuleDef module = {
    PyModuleDef_HEAD_INIT,
    "_pari_runtime_probe",
    "CoWasm PARI runtime side-module probe.",
    -1,
    methods,
};

PyMODINIT_FUNC PyInit__pari_runtime_probe(void) {
  return PyModule_Create(&module);
}
EOF

setjmp_lib="$("$bin_dir/wasi-sdk-clang-next" -target wasm32-wasip1 -print-file-name=libsetjmp.a)"
if [ ! -f "$setjmp_lib" ]; then
  echo "cypari2 runtime probe could not locate static libsetjmp.a" >&2
  exit 1
fi

"$bin_dir/wasi-sdk-clang-next" -target wasm32-wasip1 \
  -O0 \
  -fPIC \
  -D_SCHED_H \
  -shared \
  -nostdlib \
  -mllvm -wasm-enable-sjlj \
  -mllvm -wasm-use-legacy-eh=false \
  -Wl,--allow-undefined \
  -Wl,--no-entry \
  -Wl,--export=PyInit__pari_runtime_probe \
  -I"$python_include" \
  -I"$posix_wasi_sdk" \
  -I"$pari_wasi_sdk/include" \
  -I"$gmp_wasi_sdk/include" \
  "$probe_dir/pari_runtime_probe.c" \
  "$pari_wasi_sdk/lib/libpari.a" \
  "$gmp_wasi_sdk/lib/libgmp.a" \
  "$setjmp_lib" \
  -lm \
  -o "$dist_dir/cypari2/_pari_runtime_probe$extension_suffix"

audit_cpython_side_module \
  "$dist_dir/cypari2/_pari_runtime_probe$extension_suffix" \
  PyInit__pari_runtime_probe

cat >"$probe_dir/pari_cython_probe.pyx" <<'PYX'
from cypari2.paridecl cimport GEN, gp_read_str, itos


cdef extern from *:
    """
    #include <pari/pari.h>

    static int cowasm_cypari2_cython_pari_initialized = 0;

    static void cowasm_cypari2_cython_ensure_pari(void) {
      if (!cowasm_cypari2_cython_pari_initialized) {
        pari_init(8000000, 2);
        cowasm_cypari2_cython_pari_initialized = 1;
      }
    }

    static int cowasm_cypari2_cython_check_error_recovery(long *result) {
      int caught_inverse_error = 0;
      GEN value;

      cowasm_cypari2_cython_ensure_pari();

      pari_CATCH(e_INV) {
        GEN error = pari_err_last();
        caught_inverse_error = error && err_get_num(error) == e_INV;
      }
      pari_TRY {
        (void)gp_read_str("1/0");
      }
      pari_ENDCATCH;

      if (!caught_inverse_error) {
        return 0;
      }

      value = gp_read_str("13*17");
      *result = itos(value);
      return 1;
    }
    """
    void cowasm_cypari2_cython_ensure_pari()
    int cowasm_cypari2_cython_check_error_recovery(long *result)


cpdef long eval_long(str expression) except -1:
    cdef bytes encoded = expression.encode("ascii")
    cdef GEN value

    cowasm_cypari2_cython_ensure_pari()
    value = gp_read_str(<const char *>encoded)
    return itos(value)


cpdef str check_error_recovery():
    cdef long result

    if not cowasm_cypari2_cython_check_error_recovery(&result):
        raise RuntimeError("PARI inverse error was not caught as e_INV")
    return f"caught=e_INV recovered={result}"
PYX

PYTHONPATH="$py_cython:$dist_dir" python3 -m cython -3 \
  --module-name cypari2._pari_cython_probe \
  -I "$dist_dir" \
  -I "$dist_dir/cypari2" \
  -I "$pari_wasi_sdk/include" \
  --output-file "$probe_dir/pari_cython_probe.c" \
  "$probe_dir/pari_cython_probe.pyx"

"$bin_dir/wasi-sdk-clang-next" -target wasm32-wasip1 \
  -O0 \
  -fPIC \
  -D_SCHED_H \
  -shared \
  -nostdlib \
  -mllvm -wasm-enable-sjlj \
  -mllvm -wasm-use-legacy-eh=false \
  -Wl,--allow-undefined \
  -Wl,--no-entry \
  -Wl,--export=PyInit__pari_cython_probe \
  -I"$python_include" \
  -I"$dist_dir/cypari2" \
  -I"$posix_wasi_sdk" \
  -I"$pari_wasi_sdk/include" \
  -I"$gmp_wasi_sdk/include" \
  "$probe_dir/pari_cython_probe.c" \
  "$pari_wasi_sdk/lib/libpari.a" \
  "$gmp_wasi_sdk/lib/libgmp.a" \
  "$setjmp_lib" \
  -lm \
  -o "$dist_dir/cypari2/_pari_cython_probe$extension_suffix"

audit_cpython_side_module \
  "$dist_dir/cypari2/_pari_cython_probe$extension_suffix" \
  PyInit__pari_cython_probe

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
from cypari2 import _pari_cython_probe as pari_cython_probe
from cypari2 import _pari_runtime_probe as pari_probe
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
assert pari_probe.eval_long("2+3") == 5
assert pari_probe.eval_long("primepi(10000)") == 1229
assert pari_probe.eval_long("factorback(factor(360))") == 360
assert pari_probe.check_error_recovery() == "caught=e_INV recovered=221"
assert pari_probe.eval_long("13*17") == 221
assert pari_cython_probe.eval_long("2+3") == 5
assert pari_cython_probe.eval_long("primepi(10000)") == 1229
assert pari_cython_probe.eval_long("factorback(factor(360))") == 360
assert pari_cython_probe.check_error_recovery() == "caught=e_INV recovered=221"
assert pari_cython_probe.eval_long("13*17") == 221
for constructor in (lambda: objtogen(1), Pari().__call__, Gen().__getattr__("factor")):
    try:
        constructor()
    except NotImplementedError:
        pass
    else:
        raise AssertionError(f"{constructor!r} did not fail closed")
PY

echo "cypari2-build-support-ok generated-pari-declarations cython-cimport-probe runtime-placeholders libpari-side-module-error-recovery cython-pari-side-module-error-recovery"
