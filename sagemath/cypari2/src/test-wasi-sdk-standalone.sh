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

sed -i \
  '/^cpdef Gen objtogen(s)$/a cdef Gen clone_ffelt(GEN input, Gen field)' \
  "$dist_dir/cypari2/gen.pxd"

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
"""Focused CoWasm runtime subset for cypari2.gen.

This is not the full upstream cypari2 object model. It implements the first
PARI-backed ``Gen`` surface needed by Sagelite's integer factorization path:
integer conversion, display, factorization, and factor-matrix access.
Unsupported paths still fail explicitly.
"""

from .types cimport (
    CLONEBIT,
    GEN,
    set_gel,
    t_COL,
    t_FRAC,
    t_INT,
    t_MAT,
    t_POL,
    t_POLMOD,
    t_REAL,
    t_SER,
    t_VEC,
    typ,
)
from .paridecl cimport GENtostr, cgetg, gel, glength, gclone, gunclone_deep, hash_GEN, itos, pari_free
from cpython.object cimport Py_EQ, Py_GE, Py_GT, Py_LE, Py_LT, Py_NE


def _missing_runtime(*_args, **_kwargs):
    raise NotImplementedError(
        "CoWasm cypari2 currently supports only a focused PARI Gen subset; "
        "the requested cypari2 object-model path is not ported yet"
    )


cdef extern from *:
    """
    #include <pari/pari.h>

    static int cowasm_cypari2_gen_pari_initialized = 0;

    static void cowasm_cypari2_gen_ensure_pari(void) {
      if (!cowasm_cypari2_gen_pari_initialized) {
        pari_init(8000000, 2);
        cowasm_cypari2_gen_pari_initialized = 1;
      }
    }

    static int cowasm_cypari2_gen_is_inverse_error(long errnum) {
      return errnum == e_INV;
    }

    static int cowasm_cypari2_gen_eval_string(const char *expression,
                                              char **result,
                                              long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        GEN value = gp_read_str(expression);
        *result = GENtostr(value);
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_expression(const char *expression,
                                                   GEN *result,
                                                   long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(gp_read_str(expression));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_variable(GEN input,
                                                  GEN *result,
                                                  long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(gpolvar(input));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_poldegree(GEN input,
                                                   GEN variable,
                                                   GEN *result,
                                                   long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(gppoldegree(input, variable ? gvar(variable) : -1));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_pollead(GEN input,
                                                 GEN variable,
                                                 GEN *result,
                                                 long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(pollead(input, variable ? gvar(variable) : -1));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_content(GEN input,
                                                 GEN *result,
                                                 long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(content(input));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_denominator(GEN input,
                                                     GEN *result,
                                                     long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(denom(input));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_polisirreducible(GEN input,
                                                    long *result,
                                                    long *errnum) {
      int ok = 1;

      *result = 0;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = polisirreducible(input);
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_variables(GEN input,
                                                   GEN *result,
                                                   long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(variables_vec(input));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_vecrev(GEN input,
                                                long length,
                                                GEN *result,
                                                long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(gtovecrev0(input, length));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_polcoeff(GEN input,
                                                  long index,
                                                  GEN *result,
                                                  long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(polcoef(input, index, -1));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_poleval(GEN input,
                                                 GEN value,
                                                 GEN *result,
                                                 long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(poleval(input, value));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_liftpol(GEN input,
                                                 GEN *result,
                                                 long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(liftpol(input));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_compare(GEN left,
                                           GEN right,
                                           int ordered,
                                           int *result,
                                           long *errnum) {
      int ok = 1;

      *result = 0;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = ordered ? gcmp(left, right) : gequal(left, right);
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_nfbasis(GEN input,
                                                 GEN *result,
                                                 long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(nfbasis(input, NULL));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_nfinit(GEN input,
                                                long flag,
                                                long precision,
                                                GEN *result,
                                                long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(nfinit0(input, flag, nbits2prec(precision)));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_nfdisc(GEN input,
                                                GEN *result,
                                                long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(nfdisc(input));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_nfrootsof1(GEN input,
                                                    GEN *result,
                                                    long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(nfrootsof1(input));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_dirzetak(GEN nf,
                                                  GEN bound,
                                                  GEN *result,
                                                  long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(dirzetak(nf, bound));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_nfgaloisconj(GEN nf,
                                                      long flag,
                                                      GEN discriminant,
                                                      long precision,
                                                      GEN *result,
                                                      long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(galoisconj0(
            nf, flag, discriminant, nbits2prec(precision)));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_nfsubfields(GEN nf,
                                                     long degree,
                                                     GEN *result,
                                                     long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(nfsubfields(nf, degree));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_nffactor(GEN nf,
                                                  GEN polynomial,
                                                  GEN *result,
                                                  long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(nffactor(nf, polynomial));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_rnfpolredbest(
        GEN nf,
        GEN relative_polynomial,
        long flag,
        GEN *result,
        long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(rnfpolredbest(nf, relative_polynomial, flag));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_rnfinit(GEN nf,
                                                 GEN relative_polynomial,
                                                 long flag,
                                                 GEN *result,
                                                 long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(rnfinit0(nf, relative_polynomial, flag));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_nf_rnfeq(GEN nf,
                                                  GEN relative_polynomial,
                                                  GEN *result,
                                                  long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(nf_rnfeq(nf, relative_polynomial));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_nf_nfzk(GEN nf,
                                                 GEN relative_equation,
                                                 GEN *result,
                                                 long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(nf_nfzk(nf, relative_equation));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_nfeltup(GEN nf,
                                                 GEN value,
                                                 GEN nfzk,
                                                 GEN *result,
                                                 long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(nfeltup(nf, value, nfzk));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_eltabstorel_lift(
        GEN relative_equation,
        GEN value,
        GEN *result,
        long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(eltabstorel_lift(relative_equation, value));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_eltreltoabs(GEN relative_equation,
                                                     GEN value,
                                                     GEN *result,
                                                     long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(eltreltoabs(relative_equation, value));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_nfisisom(GEN left,
                                                  GEN right,
                                                  GEN *result,
                                                  long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(nfisisom(left, right));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_ideallist(GEN nf,
                                                   GEN bound,
                                                   long flag,
                                                   GEN *result,
                                                   long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(gideallist(nf, bound, flag));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_bnfinit(GEN input,
                                                 long flag,
                                                 long precision,
                                                 GEN *result,
                                                 long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(bnfinit0(input, flag, NULL, nbits2prec(precision)));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_bnfisprincipal(GEN bnf,
                                                        GEN ideal,
                                                        long flag,
                                                        GEN *result,
                                                        long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(bnfisprincipal0(bnf, ideal, flag));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_bnfcertify(GEN bnf,
                                              long flag,
                                              long *result,
                                              long *errnum) {
      int ok = 1;

      *result = 0;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = bnfcertify0(bnf, flag);
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_nffactorback(GEN nf,
                                                       GEN factors,
                                                       GEN exponents,
                                                       GEN *result,
                                                       long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(nffactorback(nf, factors, exponents));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_nfeltval(GEN nf,
                                            GEN element,
                                            GEN prime,
                                            long *result,
                                            long *errnum) {
      int ok = 1;

      *result = 0;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = nfval(nf, element, prime);
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_nfbasistoalg(GEN nf,
                                                      GEN value,
                                                      GEN *result,
                                                      long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(basistoalg(nf, value));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_random_state(GEN *result,
                                                      long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(getrand());
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_set_random_state(GEN seed,
                                                    long *errnum) {
      int ok = 1;

      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        setrand(seed);
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_nf_zk(GEN input,
                                               GEN *result,
                                               long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(nf_get_zk(input));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_nf_diff(GEN input,
                                                 GEN *result,
                                                 long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(member_diff(input));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_mat(GEN input,
                                             GEN *result,
                                             long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(gtomat(input));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_col(GEN input,
                                             GEN *result,
                                             long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(gtocol(input));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_transpose(GEN input,
                                                   GEN *result,
                                                   long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(gtrans(input));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_idealhnf(GEN nf,
                                                  GEN ideal,
                                                  GEN *result,
                                                  long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(idealhnf(nf, ideal));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_idealadd(GEN nf,
                                                  GEN left,
                                                  GEN right,
                                                  GEN *result,
                                                  long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(idealadd(nf, left, right));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_idealaddtoone(GEN nf,
                                                       GEN left,
                                                       GEN right,
                                                       GEN *result,
                                                       long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(idealaddtoone(nf, left, right));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_idealappr(GEN nf,
                                                   GEN factors,
                                                   long flag,
                                                   GEN *result,
                                                   long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(idealappr0(nf, factors, flag));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_idealcoprime(GEN nf,
                                                      GEN left,
                                                      GEN right,
                                                      GEN *result,
                                                      long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(idealcoprime(nf, left, right));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_idealfactor(GEN nf,
                                                     GEN ideal,
                                                     GEN *result,
                                                     long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(idealfactor(nf, ideal));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_idealchinese(GEN nf,
                                                      GEN factors,
                                                      GEN residues,
                                                      GEN *result,
                                                      long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(idealchinese(nf, factors, residues));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_idealintersect(GEN nf,
                                                        GEN left,
                                                        GEN right,
                                                        GEN *result,
                                                        long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(idealintersect(nf, left, right));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_idealinv(GEN nf,
                                                  GEN ideal,
                                                  GEN *result,
                                                  long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(idealinv(nf, ideal));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_idealismaximal(GEN nf,
                                                        GEN ideal,
                                                        GEN *result,
                                                        long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(idealismaximal(nf, ideal));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_idealispower(GEN nf,
                                                GEN ideal,
                                                long exponent,
                                                long *result,
                                                long *errnum) {
      int ok = 1;

      *result = 0;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = idealispower(nf, ideal, exponent, NULL);
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_idealnumden(GEN nf,
                                                     GEN ideal,
                                                     GEN *result,
                                                     long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(idealnumden(nf, ideal));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_idealred(GEN nf,
                                                  GEN ideal,
                                                  GEN *result,
                                                  long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(idealred(nf, ideal));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_idealtwoelt(GEN nf,
                                                     GEN ideal,
                                                     GEN *result,
                                                     long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(idealtwoelt(nf, ideal));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_idealval(GEN nf,
                                                  GEN ideal,
                                                  GEN prime,
                                                  GEN *result,
                                                  long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(gpidealval(nf, ideal, prime));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_idealmul(GEN nf,
                                                  GEN left,
                                                  GEN right,
                                                  GEN *result,
                                                  long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(idealmul(nf, left, right));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_idealdiv(GEN nf,
                                                  GEN left,
                                                  GEN right,
                                                  GEN *result,
                                                  long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(idealdiv(nf, left, right));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_idealpow(GEN nf,
                                                  GEN ideal,
                                                  GEN exponent,
                                                  GEN *result,
                                                  long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(idealpow(nf, ideal, exponent));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_idealnorm(GEN nf,
                                                   GEN ideal,
                                                   GEN *result,
                                                   long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(idealnorm(nf, ideal));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_nf_sign(GEN input,
                                           long *r1,
                                           long *r2,
                                           long *errnum) {
      int ok = 1;

      *r1 = 0;
      *r2 = 0;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        GEN sign = member_sign(input);
        *r1 = itos(gel(sign, 1));
        *r2 = itos(gel(sign, 2));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_change_variable_name(GEN input,
                                                        const char *variable,
                                                        GEN *result,
                                                        int *unchanged,
                                                        long *errnum) {
      int ok = 1;

      *result = NULL;
      *unchanged = 0;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        long variable_number = fetch_user_var(variable);
        if (varn(input) == variable_number) {
          *unchanged = 1;
        } else {
          *result = gclone(input);
          setvarn(*result, variable_number);
        }
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_div(GEN left,
                                             GEN right,
                                             GEN *result,
                                             long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(gdiv(left, right));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_mul(GEN left,
                                             GEN right,
                                             GEN *result,
                                             long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(gmul(left, right));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_modreverse(GEN input,
                                                    GEN *result,
                                                    long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(modreverse(input));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_modulus(GEN input,
                                                 GEN *result,
                                                 long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        if (typ(input) != t_INTMOD && typ(input) != t_POLMOD) {
          pari_err_TYPE("mod", input);
        }
        *result = gclone(gel(input, 1));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_integer(const char *digits,
                                                GEN *result,
                                                long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        if (digits[0] == '-') {
          *result = gclone(gneg(strtoi(digits + 1)));
        } else if (digits[0] == '+') {
          *result = gclone(strtoi(digits + 1));
        } else {
          *result = gclone(strtoi(digits));
        }
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_factor(GEN input,
                                               int has_proof,
                                               int proof,
                                               GEN *result,
                                               long *errnum) {
      int ok = 1;
      int saved_factor_proven;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();
      saved_factor_proven = factor_proven;

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        if (has_proof) {
          factor_proven = proof ? 1 : 0;
        }
        *result = gclone(factor(input));
      }
      pari_ENDCATCH;

      factor_proven = saved_factor_proven;
      return ok;
    }

    static int cowasm_cypari2_gen_clone_nextprime(GEN input,
                                                  int add_one,
                                                  GEN *result,
                                                  long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(nextprime(add_one ? gaddsg(1, input) : input));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_znorder(GEN input,
                                                GEN multiple,
                                                int has_multiple,
                                                GEN *result,
                                                long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(znorder(input, has_multiple ? multiple : NULL));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_eulerphi(GEN input,
                                                 GEN *result,
                                                 long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(eulerphi(input));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_ispseudoprime(GEN input,
                                                long flag,
                                                long *result,
                                                long *errnum) {
      int ok = 1;

      *result = 0;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = ispseudoprime(input, flag);
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_isprime(GEN input,
                                          long *result,
                                          long *errnum) {
      int ok = 1;

      *result = 0;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = isprime(input);
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_primepower(GEN input,
                                                   int proven,
                                                   long *power,
                                                   GEN *base,
                                                   long *errnum) {
      int ok = 1;

      *power = 0;
      *base = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        if (proven) {
          *power = isprimepower(input, base);
        } else {
          *power = ispseudoprimepower(input, base);
        }
        if (*base != NULL) {
          *base = gclone(*base);
        }
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_ispower(GEN input,
                                                GEN k,
                                                int has_k,
                                                long *power,
                                                GEN *base,
                                                long *errnum) {
      int ok = 1;
      long n = 0;
      GEN y = NULL;

      *power = 0;
      *base = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        if (has_k) {
          n = ispower(input, k, &y);
          if (n != 0) {
            *power = 1;
            *base = gclone(y);
          }
        } else {
          n = gisanypower(input, &y);
          if (n == 0) {
            *power = 1;
            *base = gclone(input);
          } else {
            *power = n;
            *base = gclone(y);
          }
        }
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_prime(long n,
                                              GEN *result,
                                              long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(prime(n));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_ffinit(GEN p,
                                               long degree,
                                               GEN *result,
                                               long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(ffinit(p, degree, -1));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_ffgen(GEN polynomial,
                                              GEN *result,
                                              long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(ffgen(polynomial, -1));
      }
      pari_ENDCATCH;

      return ok;
    }

    static const char *cowasm_cypari2_gen_type_name(GEN input) {
      return type_name(typ(input));
    }

    static int cowasm_cypari2_gen_clone_lift(GEN input,
                                             GEN *result,
                                             long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(lift(input));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_simplify(GEN input,
                                                 GEN *result,
                                                 long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(simplify(input));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_lifted_polcoeffs(GEN input,
                                                         GEN *result,
                                                         long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        GEN lifted = lift(input);
        long degree = poldegree(lifted, -1);
        *result = gclone(RgX_to_RgC(lifted, degree < 0 ? 0 : degree + 1));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_mod(GEN input,
                                            GEN modulus,
                                            GEN *result,
                                            long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(gmodulo(input, modulus));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_polrev(GEN input,
                                               const char *variable,
                                               GEN *result,
                                               long *errnum) {
      int ok = 1;
      long variable_number = -1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        if (variable != NULL) {
          variable_number = fetch_user_var(variable);
        }
        *result = gclone(gtopolyrev(input, variable_number));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_fffrobenius(GEN input,
                                                    long power,
                                                    GEN *result,
                                                    long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(fffrobenius(input, power));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_ffcompomap(GEN left,
                                                   GEN right,
                                                   GEN *result,
                                                   long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(ffcompomap(left, right));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_ffmap(GEN map,
                                              GEN input,
                                              GEN *result,
                                              long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        *result = gclone(ffmap(map, input));
      }
      pari_ENDCATCH;

      return ok;
    }

    static int cowasm_cypari2_gen_clone_ffelt(GEN input,
                                               GEN field,
                                               GEN *result,
                                               long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_gen_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        if (typ(input) != t_FFELT || typ(field) != t_FFELT) {
          pari_err_TYPE("clone_ffelt", typ(input) != t_FFELT ? input : field);
        }
        if (!FF_samefield(input, field)) {
          pari_err_MODULUS("clone_ffelt", input, field);
        }
        *result = gclone(Fq_to_FF(FF_to_FpXQ(input), field));
      }
      pari_ENDCATCH;

      return ok;
    }
    """
    void cowasm_cypari2_gen_ensure_pari()
    int cowasm_cypari2_gen_is_inverse_error(long errnum)
    int cowasm_cypari2_gen_eval_string(const char *expression,
                                       char **result,
                                       long *errnum)
    int cowasm_cypari2_gen_clone_expression(const char *expression,
                                            GEN *result,
                                            long *errnum)
    int cowasm_cypari2_gen_clone_variable(GEN input,
                                          GEN *result,
                                          long *errnum)
    int cowasm_cypari2_gen_clone_poldegree(GEN input,
                                           GEN variable,
                                           GEN *result,
                                           long *errnum)
    int cowasm_cypari2_gen_clone_pollead(GEN input,
                                         GEN variable,
                                         GEN *result,
                                         long *errnum)
    int cowasm_cypari2_gen_clone_content(GEN input,
                                         GEN *result,
                                         long *errnum)
    int cowasm_cypari2_gen_clone_denominator(GEN input,
                                             GEN *result,
                                             long *errnum)
    int cowasm_cypari2_gen_polisirreducible(GEN input,
                                            long *result,
                                            long *errnum)
    int cowasm_cypari2_gen_clone_variables(GEN input,
                                           GEN *result,
                                           long *errnum)
    int cowasm_cypari2_gen_clone_vecrev(GEN input,
                                        long length,
                                        GEN *result,
                                        long *errnum)
    int cowasm_cypari2_gen_clone_polcoeff(GEN input,
                                          long index,
                                          GEN *result,
                                          long *errnum)
    int cowasm_cypari2_gen_clone_poleval(GEN input,
                                         GEN value,
                                         GEN *result,
                                         long *errnum)
    int cowasm_cypari2_gen_clone_liftpol(GEN input,
                                         GEN *result,
                                         long *errnum)
    int cowasm_cypari2_gen_compare(GEN left,
                                   GEN right,
                                   int ordered,
                                   int *result,
                                   long *errnum)
    int cowasm_cypari2_gen_clone_nfbasis(GEN input,
                                         GEN *result,
                                         long *errnum)
    int cowasm_cypari2_gen_clone_nfinit(GEN input,
                                         long flag,
                                         long precision,
                                         GEN *result,
                                         long *errnum)
    int cowasm_cypari2_gen_clone_nfdisc(GEN input,
                                        GEN *result,
                                        long *errnum)
    int cowasm_cypari2_gen_clone_nfrootsof1(GEN input,
                                            GEN *result,
                                            long *errnum)
    int cowasm_cypari2_gen_clone_dirzetak(GEN nf,
                                          GEN bound,
                                          GEN *result,
                                          long *errnum)
    int cowasm_cypari2_gen_clone_nfgaloisconj(GEN nf,
                                              long flag,
                                              GEN discriminant,
                                              long precision,
                                              GEN *result,
                                              long *errnum)
    int cowasm_cypari2_gen_clone_nfsubfields(GEN nf,
                                             long degree,
                                             GEN *result,
                                             long *errnum)
    int cowasm_cypari2_gen_clone_nffactor(GEN nf,
                                          GEN polynomial,
                                          GEN *result,
                                          long *errnum)
    int cowasm_cypari2_gen_clone_rnfpolredbest(GEN nf,
                                               GEN relative_polynomial,
                                               long flag,
                                               GEN *result,
                                               long *errnum)
    int cowasm_cypari2_gen_clone_rnfinit(GEN nf,
                                         GEN relative_polynomial,
                                         long flag,
                                         GEN *result,
                                         long *errnum)
    int cowasm_cypari2_gen_clone_nf_rnfeq(GEN nf,
                                          GEN relative_polynomial,
                                          GEN *result,
                                          long *errnum)
    int cowasm_cypari2_gen_clone_nf_nfzk(GEN nf,
                                         GEN relative_equation,
                                         GEN *result,
                                         long *errnum)
    int cowasm_cypari2_gen_clone_nfeltup(GEN nf,
                                         GEN value,
                                         GEN nfzk,
                                         GEN *result,
                                         long *errnum)
    int cowasm_cypari2_gen_clone_eltabstorel_lift(GEN relative_equation,
                                                   GEN value,
                                                   GEN *result,
                                                   long *errnum)
    int cowasm_cypari2_gen_clone_eltreltoabs(GEN relative_equation,
                                             GEN value,
                                             GEN *result,
                                             long *errnum)
    int cowasm_cypari2_gen_clone_nfisisom(GEN left,
                                          GEN right,
                                          GEN *result,
                                          long *errnum)
    int cowasm_cypari2_gen_clone_ideallist(GEN nf,
                                           GEN bound,
                                           long flag,
                                           GEN *result,
                                           long *errnum)
    int cowasm_cypari2_gen_clone_bnfinit(GEN input,
                                          long flag,
                                          long precision,
                                          GEN *result,
                                          long *errnum)
    int cowasm_cypari2_gen_clone_bnfisprincipal(GEN bnf,
                                                 GEN ideal,
                                                 long flag,
                                                 GEN *result,
                                                 long *errnum)
    int cowasm_cypari2_gen_bnfcertify(GEN bnf,
                                       long flag,
                                       long *result,
                                       long *errnum)
    int cowasm_cypari2_gen_clone_nffactorback(GEN nf,
                                               GEN factors,
                                               GEN exponents,
                                               GEN *result,
                                               long *errnum)
    int cowasm_cypari2_gen_nfeltval(GEN nf,
                                    GEN element,
                                    GEN prime,
                                    long *result,
                                    long *errnum)
    int cowasm_cypari2_gen_clone_nfbasistoalg(GEN nf,
                                               GEN value,
                                               GEN *result,
                                               long *errnum)
    int cowasm_cypari2_gen_clone_random_state(GEN *result,
                                               long *errnum)
    int cowasm_cypari2_gen_set_random_state(GEN seed,
                                             long *errnum)
    int cowasm_cypari2_gen_clone_nf_zk(GEN input,
                                       GEN *result,
                                       long *errnum)
    int cowasm_cypari2_gen_clone_nf_diff(GEN input,
                                         GEN *result,
                                         long *errnum)
    int cowasm_cypari2_gen_clone_mat(GEN input,
                                     GEN *result,
                                     long *errnum)
    int cowasm_cypari2_gen_clone_col(GEN input,
                                     GEN *result,
                                     long *errnum)
    int cowasm_cypari2_gen_clone_transpose(GEN input,
                                           GEN *result,
                                           long *errnum)
    int cowasm_cypari2_gen_clone_idealhnf(GEN nf,
                                          GEN ideal,
                                          GEN *result,
                                          long *errnum)
    int cowasm_cypari2_gen_clone_idealadd(GEN nf,
                                          GEN left,
                                          GEN right,
                                          GEN *result,
                                          long *errnum)
    int cowasm_cypari2_gen_clone_idealaddtoone(GEN nf,
                                               GEN left,
                                               GEN right,
                                               GEN *result,
                                               long *errnum)
    int cowasm_cypari2_gen_clone_idealappr(GEN nf,
                                           GEN factors,
                                           long flag,
                                           GEN *result,
                                           long *errnum)
    int cowasm_cypari2_gen_clone_idealcoprime(GEN nf,
                                              GEN left,
                                              GEN right,
                                              GEN *result,
                                              long *errnum)
    int cowasm_cypari2_gen_clone_idealfactor(GEN nf,
                                             GEN ideal,
                                             GEN *result,
                                             long *errnum)
    int cowasm_cypari2_gen_clone_idealchinese(GEN nf,
                                              GEN factors,
                                              GEN residues,
                                              GEN *result,
                                              long *errnum)
    int cowasm_cypari2_gen_clone_idealintersect(GEN nf,
                                                GEN left,
                                                GEN right,
                                                GEN *result,
                                                long *errnum)
    int cowasm_cypari2_gen_clone_idealinv(GEN nf,
                                          GEN ideal,
                                          GEN *result,
                                          long *errnum)
    int cowasm_cypari2_gen_clone_idealismaximal(GEN nf,
                                                GEN ideal,
                                                GEN *result,
                                                long *errnum)
    int cowasm_cypari2_gen_idealispower(GEN nf,
                                        GEN ideal,
                                        long exponent,
                                        long *result,
                                        long *errnum)
    int cowasm_cypari2_gen_clone_idealnumden(GEN nf,
                                             GEN ideal,
                                             GEN *result,
                                             long *errnum)
    int cowasm_cypari2_gen_clone_idealred(GEN nf,
                                          GEN ideal,
                                          GEN *result,
                                          long *errnum)
    int cowasm_cypari2_gen_clone_idealtwoelt(GEN nf,
                                             GEN ideal,
                                             GEN *result,
                                             long *errnum)
    int cowasm_cypari2_gen_clone_idealval(GEN nf,
                                          GEN ideal,
                                          GEN prime,
                                          GEN *result,
                                          long *errnum)
    int cowasm_cypari2_gen_clone_idealmul(GEN nf,
                                          GEN left,
                                          GEN right,
                                          GEN *result,
                                          long *errnum)
    int cowasm_cypari2_gen_clone_idealdiv(GEN nf,
                                          GEN left,
                                          GEN right,
                                          GEN *result,
                                          long *errnum)
    int cowasm_cypari2_gen_clone_idealpow(GEN nf,
                                          GEN ideal,
                                          GEN exponent,
                                          GEN *result,
                                          long *errnum)
    int cowasm_cypari2_gen_clone_idealnorm(GEN nf,
                                           GEN ideal,
                                           GEN *result,
                                           long *errnum)
    int cowasm_cypari2_gen_nf_sign(GEN input,
                                   long *r1,
                                   long *r2,
                                   long *errnum)
    int cowasm_cypari2_gen_change_variable_name(GEN input,
                                                const char *variable,
                                                GEN *result,
                                                int *unchanged,
                                                long *errnum)
    int cowasm_cypari2_gen_clone_div(GEN left,
                                     GEN right,
                                     GEN *result,
                                     long *errnum)
    int cowasm_cypari2_gen_clone_mul(GEN left,
                                     GEN right,
                                     GEN *result,
                                     long *errnum)
    int cowasm_cypari2_gen_clone_modreverse(GEN input,
                                             GEN *result,
                                             long *errnum)
    int cowasm_cypari2_gen_clone_modulus(GEN input,
                                         GEN *result,
                                         long *errnum)
    int cowasm_cypari2_gen_clone_integer(const char *digits,
                                         GEN *result,
                                         long *errnum)
    int cowasm_cypari2_gen_clone_factor(GEN input,
                                        int has_proof,
                                        int proof,
                                        GEN *result,
                                        long *errnum)
    int cowasm_cypari2_gen_clone_nextprime(GEN input,
                                           int add_one,
                                           GEN *result,
                                           long *errnum)
    int cowasm_cypari2_gen_clone_znorder(GEN input,
                                         GEN multiple,
                                         int has_multiple,
                                         GEN *result,
                                         long *errnum)
    int cowasm_cypari2_gen_clone_eulerphi(GEN input,
                                          GEN *result,
                                          long *errnum)
    int cowasm_cypari2_gen_ispseudoprime(GEN input,
                                         long flag,
                                         long *result,
                                         long *errnum)
    int cowasm_cypari2_gen_isprime(GEN input,
                                   long *result,
                                   long *errnum)
    int cowasm_cypari2_gen_clone_primepower(GEN input,
                                            int proven,
                                            long *power,
                                            GEN *base,
                                            long *errnum)
    int cowasm_cypari2_gen_clone_ispower(GEN input,
                                         GEN k,
                                         int has_k,
                                         long *power,
                                         GEN *base,
                                         long *errnum)
    int cowasm_cypari2_gen_clone_prime(long n,
                                       GEN *result,
                                       long *errnum)
    int cowasm_cypari2_gen_clone_ffinit(GEN p,
                                        long degree,
                                        GEN *result,
                                        long *errnum)
    int cowasm_cypari2_gen_clone_ffgen(GEN polynomial,
                                       GEN *result,
                                       long *errnum)
    const char *cowasm_cypari2_gen_type_name(GEN input)
    int cowasm_cypari2_gen_clone_lift(GEN input,
                                      GEN *result,
                                      long *errnum)
    int cowasm_cypari2_gen_clone_simplify(GEN input,
                                          GEN *result,
                                          long *errnum)
    int cowasm_cypari2_gen_clone_lifted_polcoeffs(GEN input,
                                                  GEN *result,
                                                  long *errnum)
    int cowasm_cypari2_gen_clone_mod(GEN input,
                                     GEN modulus,
                                     GEN *result,
                                     long *errnum)
    int cowasm_cypari2_gen_clone_polrev(GEN input,
                                        const char *variable,
                                        GEN *result,
                                        long *errnum)
    int cowasm_cypari2_gen_clone_fffrobenius(GEN input,
                                             long power,
                                             GEN *result,
                                             long *errnum)
    int cowasm_cypari2_gen_clone_ffcompomap(GEN left,
                                            GEN right,
                                            GEN *result,
                                            long *errnum)
    int cowasm_cypari2_gen_clone_ffmap(GEN map,
                                       GEN input,
                                       GEN *result,
                                       long *errnum)
    int cowasm_cypari2_gen_clone_ffelt(GEN input,
                                       GEN field,
                                       GEN *result,
                                       long *errnum)


_debug_level = 0


cdef object _raise_pari_error(long errnum):
    from cypari2.handle_error import PariError
    if cowasm_cypari2_gen_is_inverse_error(errnum):
        raise PariError("impossible inverse in gdiv: 0")
    raise PariError(f"PARI error {errnum}")


cdef Gen _new_owned(GEN g):
    cdef Gen z = <Gen>Gen.__new__(Gen)
    z.g = g
    z.address = g
    z.next = None
    z.itemcache = None
    return z


cdef Gen _new_clone(GEN g):
    return _new_owned(gclone(g))


cdef Gen clone_ffelt(GEN input, Gen field):
    cdef GEN result = NULL
    cdef long errnum = 0

    if not cowasm_cypari2_gen_clone_ffelt(
        input, field.g, &result, &errnum
    ):
        _raise_pari_error(errnum)
    return _new_owned(result)


cdef bint _is_integer_text(str text):
    cdef str body = text.strip()
    if not body:
        return False
    if body[0] in "+-":
        body = body[1:]
    return bool(body) and body.isdigit()


def _int_from_real_text(str text):
    cdef str body = text.strip()
    cdef str integer_part
    cdef str fraction_part

    if " E" in body or "e" in body:
        from cypari2.handle_error import PariError
        raise PariError("precision too low in truncr (precision loss in truncation)")

    integer_part, separator, fraction_part = body.partition(".")
    if not separator or fraction_part.strip("0"):
        raise TypeError("Attempt to coerce non-integral real number to an Integer")
    return int(integer_part)


def _raise_polmod_integer_error(str text):
    cdef str value = text

    if value.startswith("Mod(") and "," in value:
        value = value[4:value.find(",")].strip()
    raise TypeError(f"Unable to coerce PARI {value} to an Integer")


def _exact_rational_parts(value):
    """Return integer numerator/denominator parts for rational-like values."""
    numerator = getattr(value, "numerator", None)
    denominator = getattr(value, "denominator", None)
    if numerator is None or denominator is None:
        return None
    if callable(numerator):
        numerator = numerator()
    if callable(denominator):
        denominator = denominator()
    try:
        return int(numerator), int(denominator)
    except (TypeError, ValueError, OverflowError):
        return None


cpdef str eval_string(str expression):
    cdef bytes encoded = expression.encode("ascii")
    cdef char *output = NULL
    cdef long errnum = 0

    if not cowasm_cypari2_gen_eval_string(<const char *>encoded, &output, &errnum):
        _raise_pari_error(errnum)

    try:
        return output.decode("ascii")
    finally:
        if output != NULL:
            pari_free(output)


cpdef int get_debug_level():
    return int(_debug_level)


cpdef set_debug_level(int level):
    global _debug_level
    _debug_level = int(level)


cpdef Gen get_random_state():
    cdef GEN result = NULL
    cdef long errnum = 0

    if not cowasm_cypari2_gen_clone_random_state(&result, &errnum):
        _raise_pari_error(errnum)
    return _new_owned(result)


cpdef set_random_state(seed):
    cdef Gen converted = objtogen(seed)
    cdef long errnum = 0

    if not cowasm_cypari2_gen_set_random_state(converted.g, &errnum):
        _raise_pari_error(errnum)


cdef class Gen_base:
    pass


cdef class Gen(Gen_base):
    def __init__(self, value=None):
        cdef Gen converted
        if value is None:
            self.g = NULL
            self.address = NULL
            self.next = None
            self.itemcache = None
            return
        converted = objtogen(value)
        self.g = gclone(converted.g)
        self.address = self.g
        self.next = None
        self.itemcache = None

    def __dealloc__(self):
        if self.address != NULL:
            gunclone_deep(self.address)
            self.address = NULL
            self.g = NULL

    def __getattr__(self, _name):
        if _name in ("_rational_", "_repr_html_", "_repr_option",
                     "_repr_pretty_", "parent"):
            # Sage probes these optional conversion and display hooks before
            # using dedicated Gen converters or plain repr.  Do not advertise
            # hooks that this focused runtime does not implement.
            raise AttributeError(_name)
        return _missing_runtime

    def __repr__(self):
        cdef char *output = NULL
        if self.g == NULL:
            return "Gen()"
        cowasm_cypari2_gen_ensure_pari()
        output = GENtostr(self.g)
        try:
            return output.decode("ascii")
        finally:
            if output != NULL:
                pari_free(output)

    def __str__(self):
        return self.__repr__()

    def __hash__(self):
        """Return PARI's value hash, independent of wrapper identity."""
        cdef unsigned long *words
        cdef unsigned long header
        cdef unsigned long clean_header
        cdef unsigned long result

        if self.g == NULL:
            raise TypeError("empty PARI object is not hashable")

        # PARI's hash has historically included the allocation-only clone bit.
        # Match upstream cypari2 by clearing it only for the hash operation.
        words = <unsigned long *>self.g
        header = words[0]
        clean_header = header & ~<unsigned long>CLONEBIT
        if header != clean_header:
            words[0] = clean_header
        result = hash_GEN(self.g)
        if header != clean_header:
            words[0] = header
        return result

    def __call__(self, *args, **kwargs):
        cdef Gen converted
        cdef GEN result = NULL
        cdef long errnum = 0

        if kwargs or len(args) != 1 or self.g == NULL or typ(self.g) != t_POL:
            return _missing_runtime(*args, **kwargs)
        converted = objtogen(args[0])
        if not cowasm_cypari2_gen_clone_poleval(
            self.g, converted.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def __richcmp__(self, right, int op):
        cdef Gen converted
        cdef int result = 0
        cdef long errnum = 0
        cdef int ordered = op not in (Py_EQ, Py_NE)

        try:
            converted = objtogen(right)
        except Exception:
            return NotImplemented
        if not cowasm_cypari2_gen_compare(
            self.g, converted.g, ordered, &result, &errnum
        ):
            _raise_pari_error(errnum)
        if op == Py_EQ:
            return result != 0
        if op == Py_NE:
            return result == 0
        if op == Py_LT:
            return result < 0
        if op == Py_LE:
            return result <= 0
        if op == Py_GT:
            return result > 0
        return result >= 0

    def gequal(self, right):
        cdef Gen converted = objtogen(right)
        cdef int result = 0
        cdef long errnum = 0

        if not cowasm_cypari2_gen_compare(
            self.g, converted.g, 0, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return result != 0

    def __len__(self):
        cdef long kind
        if self.g == NULL:
            return 0
        kind = typ(self.g)
        if kind == t_MAT or kind == t_VEC or kind == t_COL:
            return glength(self.g)
        raise TypeError("PARI object does not have a Python length")

    def length(self):
        if self.g == NULL:
            return 0
        return glength(self.g)

    def __bool__(self):
        return self != 0

    def __iter__(self):
        cdef Py_ssize_t i
        for i in range(len(self)):
            yield self[i]

    def __getitem__(self, key):
        cdef long kind
        cdef Py_ssize_t row
        cdef Py_ssize_t col
        cdef Py_ssize_t n
        cdef GEN column
        cdef GEN result = NULL
        cdef long errnum = 0

        if self.g == NULL:
            raise IndexError("empty PARI object")

        kind = typ(self.g)
        if isinstance(key, slice):
            if kind not in (t_VEC, t_COL):
                return _missing_runtime(key)
            return objtogen([
                self[i] for i in range(*key.indices(glength(self.g)))
            ])
        if kind == t_MAT:
            if isinstance(key, tuple):
                if len(key) != 2:
                    raise IndexError("PARI matrix indices must be row, column")
                row = key[0]
                col = key[1]
                if col < 0 or col >= glength(self.g):
                    raise IndexError("PARI matrix column index out of range")
                column = gel(self.g, col + 1)
                if row < 0 or row >= glength(column):
                    raise IndexError("PARI matrix row index out of range")
                return _new_clone(gel(column, row + 1))
            col = key
            if col < 0 or col >= glength(self.g):
                raise IndexError("PARI matrix column index out of range")
            return _new_clone(gel(self.g, col + 1))

        if kind == t_POL:
            n = key
            if not cowasm_cypari2_gen_clone_polcoeff(
                self.g, n, &result, &errnum
            ):
                _raise_pari_error(errnum)
            return _new_owned(result)

        if kind == t_VEC or kind == t_COL:
            n = key
            if n < 0 or n >= glength(self.g):
                raise IndexError("PARI vector index out of range")
            return _new_clone(gel(self.g, n + 1))

        raise TypeError("PARI object is not indexable")

    def __int__(self):
        cdef long kind
        cdef str text

        if self.g == NULL:
            raise TypeError("empty PARI object is not an integer")

        kind = typ(self.g)
        text = str(self)
        if kind == t_REAL:
            return _int_from_real_text(text)
        if kind == t_POLMOD:
            _raise_polmod_integer_error(text)
        return int(text)

    def __index__(self):
        return int(self)

    def __truediv__(left, right):
        cdef Gen converted_left = objtogen(left)
        cdef Gen converted_right = objtogen(right)
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_div(
            converted_left.g, converted_right.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def __rtruediv__(right, left):
        cdef Gen converted_left = objtogen(left)
        cdef Gen converted_right = objtogen(right)
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_div(
            converted_left.g, converted_right.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def __mul__(left, right):
        cdef Gen converted_left = objtogen(left)
        cdef Gen converted_right = objtogen(right)
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_mul(
            converted_left.g, converted_right.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def __rmul__(right, left):
        cdef Gen converted_left = objtogen(left)
        cdef Gen converted_right = objtogen(right)
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_mul(
            converted_left.g, converted_right.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def ncols(self):
        if self.g == NULL or typ(self.g) != t_MAT:
            raise TypeError("PARI object is not a matrix")
        return glength(self.g)

    def nrows(self):
        if self.g == NULL or typ(self.g) != t_MAT:
            raise TypeError("PARI object is not a matrix")
        if glength(self.g) == 0:
            return 0
        return glength(gel(self.g, 1))

    def python_list(self):
        return [self[i] for i in range(len(self))]

    def list(self):
        cdef GEN result = NULL
        cdef long errnum = 0

        if self.g != NULL and typ(self.g) == t_POL:
            if not cowasm_cypari2_gen_clone_lifted_polcoeffs(
                self.g, &result, &errnum
            ):
                _raise_pari_error(errnum)
            return _new_owned(result).python_list()
        return self.python_list()

    def sage(self, locals=None):
        from sage.libs.pari.convert_sage import gen_to_sage
        return gen_to_sage(self, locals)

    def Mat(self):
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_mat(self.g, &result, &errnum):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def Col(self):
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_col(self.g, &result, &errnum):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def mattranspose(self):
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_transpose(self.g, &result, &errnum):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def type(self):
        if self.g == NULL:
            raise TypeError("empty PARI object has no type")
        return cowasm_cypari2_gen_type_name(self.g).decode("ascii")

    def variable(self):
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_variable(self.g, &result, &errnum):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def poldegree(self, variable=None):
        cdef Gen converted
        cdef GEN result = NULL
        cdef GEN variable_gen = NULL
        cdef long errnum = 0

        if variable is not None:
            converted = objtogen(variable)
            variable_gen = converted.g
        if not cowasm_cypari2_gen_clone_poldegree(
            self.g, variable_gen, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def pollead(self, variable=None):
        cdef Gen converted
        cdef GEN result = NULL
        cdef GEN variable_gen = NULL
        cdef long errnum = 0

        if variable is not None:
            converted = objtogen(variable)
            variable_gen = converted.g
        if not cowasm_cypari2_gen_clone_pollead(
            self.g, variable_gen, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def content(self, *args, **kwargs):
        cdef GEN result = NULL
        cdef long errnum = 0

        if args or kwargs:
            return _missing_runtime(*args, **kwargs)
        if not cowasm_cypari2_gen_clone_content(self.g, &result, &errnum):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def denominator(self, *args, **kwargs):
        cdef GEN result = NULL
        cdef long errnum = 0

        if args or kwargs:
            return _missing_runtime(*args, **kwargs)
        if not cowasm_cypari2_gen_clone_denominator(self.g, &result, &errnum):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def polisirreducible(self):
        cdef long result = 0
        cdef long errnum = 0

        if not cowasm_cypari2_gen_polisirreducible(
            self.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return bool(result)

    def liftpol(self):
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_liftpol(self.g, &result, &errnum):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def variables(self):
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_variables(self.g, &result, &errnum):
            _raise_pari_error(errnum)
        return _new_owned(result).python_list()

    def Vecrev(self, long length=0):
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_vecrev(
            self.g, length, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def nfbasis(self, *args, **kwargs):
        cdef GEN result = NULL
        cdef long errnum = 0

        if args or kwargs:
            return _missing_runtime(*args, **kwargs)
        if not cowasm_cypari2_gen_clone_nfbasis(self.g, &result, &errnum):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def nfinit(self, long flag=0, long precision=64):
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_nfinit(
            self.g, flag, precision, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def nfdisc(self):
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_nfdisc(
            self.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def nfrootsof1(self):
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_nfrootsof1(
            self.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def dirzetak(self, bound):
        cdef Gen converted = objtogen(bound)
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_dirzetak(
            self.g, converted.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def nfgaloisconj(self, long flag=0, d=None, long precision=64):
        cdef Gen converted
        cdef GEN converted_gen = NULL
        cdef GEN result = NULL
        cdef long errnum = 0

        if d is not None:
            converted = objtogen(d)
            converted_gen = converted.g
        if not cowasm_cypari2_gen_clone_nfgaloisconj(
            self.g, flag, converted_gen, precision, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def nfsubfields(self, long degree=0):
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_nfsubfields(
            self.g, degree, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def nffactor(self, polynomial):
        cdef Gen converted = objtogen(polynomial)
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_nffactor(
            self.g, converted.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def rnfpolredbest(self, polynomial, long flag=0):
        cdef Gen converted = objtogen(polynomial)
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_rnfpolredbest(
            self.g, converted.g, flag, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def rnfinit(self, relative_polynomial, long flag=0):
        cdef Gen converted = objtogen(relative_polynomial)
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_rnfinit(
            self.g, converted.g, flag, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def _nf_rnfeq(self, relative_polynomial):
        cdef Gen converted = objtogen(relative_polynomial)
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_nf_rnfeq(
            self.g, converted.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def _nf_nfzk(self, relative_equation):
        cdef Gen converted = objtogen(relative_equation)
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_nf_nfzk(
            self.g, converted.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def _nfeltup(self, value, nfzk):
        cdef Gen converted_value = objtogen(value)
        cdef Gen converted_nfzk = objtogen(nfzk)
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_nfeltup(
            self.g,
            converted_value.g,
            converted_nfzk.g,
            &result,
            &errnum,
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def _eltabstorel_lift(self, value):
        cdef Gen converted = objtogen(value)
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_eltabstorel_lift(
            self.g, converted.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def _eltreltoabs(self, value):
        cdef Gen converted = objtogen(value)
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_eltreltoabs(
            self.g, converted.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def nfisisom(self, other):
        cdef Gen converted = objtogen(other)
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_nfisisom(
            self.g, converted.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def ideallist(self, bound, long flag=4):
        cdef Gen converted = objtogen(bound)
        cdef GEN result = NULL
        cdef long errnum = 0

        if self.g == NULL or typ(self.g) != t_VEC:
            raise TypeError("PARI ideal operations require a number field")
        if not cowasm_cypari2_gen_clone_ideallist(
            self.g, converted.g, flag, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def bnfinit(self, long flag=0, tech=None, long precision=64):
        cdef GEN result = NULL
        cdef long errnum = 0

        if tech is not None:
            return _missing_runtime(tech)
        if not cowasm_cypari2_gen_clone_bnfinit(
            self.g, flag, precision, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def bnfisprincipal(self, ideal, long flag=1):
        cdef Gen converted = objtogen(ideal)
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_bnfisprincipal(
            self.g, converted.g, flag, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def bnfcertify(self, long flag=0):
        cdef long result = 0
        cdef long errnum = 0

        if not cowasm_cypari2_gen_bnfcertify(
            self.g, flag, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return result

    def nffactorback(self, factors, exponents=None):
        cdef Gen converted_factors = objtogen(factors)
        cdef Gen converted_exponents
        cdef GEN exponent_gen = NULL
        cdef GEN result = NULL
        cdef long errnum = 0

        if exponents is not None:
            converted_exponents = objtogen(exponents)
            exponent_gen = converted_exponents.g
        if not cowasm_cypari2_gen_clone_nffactorback(
            self.g, converted_factors.g, exponent_gen, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def nfeltval(self, element, prime):
        cdef Gen converted_element
        cdef Gen converted_prime
        cdef long result = 0
        cdef long errnum = 0

        if self.g == NULL or typ(self.g) != t_VEC:
            raise TypeError("PARI element valuations require a number field")
        converted_element = objtogen(element)
        converted_prime = objtogen(prime)
        if not cowasm_cypari2_gen_nfeltval(
            self.g, converted_element.g, converted_prime.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return result

    def nfbasistoalg(self, value):
        cdef Gen converted = objtogen(value)
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_nfbasistoalg(
            self.g, converted.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def nfbasistoalg_lift(self, value):
        return self.nfbasistoalg(value).lift()

    def nf_get_zk(self):
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_nf_zk(self.g, &result, &errnum):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def nf_get_diff(self):
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_nf_diff(self.g, &result, &errnum):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def pr_get_p(self):
        if self.g == NULL or typ(self.g) != t_VEC or glength(self.g) != 5:
            raise TypeError("PARI object is not a prime ideal")
        return self[0]

    def pr_get_gen(self):
        if self.g == NULL or typ(self.g) != t_VEC or glength(self.g) != 5:
            raise TypeError("PARI object is not a prime ideal")
        return self[1]

    def pr_get_e(self):
        if self.g == NULL or typ(self.g) != t_VEC or glength(self.g) != 5:
            raise TypeError("PARI object is not a prime ideal")
        return self[2]

    def pr_get_f(self):
        if self.g == NULL or typ(self.g) != t_VEC or glength(self.g) != 5:
            raise TypeError("PARI object is not a prime ideal")
        return self[3]

    def idealhnf(self, ideal):
        cdef Gen converted = objtogen(ideal)
        cdef GEN result = NULL
        cdef long errnum = 0

        if self.g == NULL or typ(self.g) != t_VEC:
            raise TypeError("PARI ideal operations require a number field")
        if not cowasm_cypari2_gen_clone_idealhnf(
            self.g, converted.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def idealadd(self, left, right):
        cdef Gen converted_left = objtogen(left)
        cdef Gen converted_right = objtogen(right)
        cdef GEN result = NULL
        cdef long errnum = 0

        if self.g == NULL or typ(self.g) != t_VEC:
            raise TypeError("PARI ideal operations require a number field")
        if not cowasm_cypari2_gen_clone_idealadd(
            self.g, converted_left.g, converted_right.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def idealaddtoone(self, left, right):
        cdef Gen converted_left
        cdef Gen converted_right
        cdef GEN result = NULL
        cdef long errnum = 0

        if self.g == NULL or typ(self.g) != t_VEC:
            raise TypeError("PARI ideal operations require a number field")
        if not isinstance(left, Gen) and hasattr(left, "pari_hnf"):
            left = left.pari_hnf()
        if not isinstance(right, Gen) and hasattr(right, "pari_hnf"):
            right = right.pari_hnf()
        converted_left = objtogen(left)
        converted_right = objtogen(right)
        if not cowasm_cypari2_gen_clone_idealaddtoone(
            self.g, converted_left.g, converted_right.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def idealappr(self, factors, long flag=0):
        cdef Gen converted = objtogen(factors)
        cdef GEN result = NULL
        cdef long errnum = 0

        if self.g == NULL or typ(self.g) != t_VEC:
            raise TypeError("PARI ideal operations require a number field")
        if not cowasm_cypari2_gen_clone_idealappr(
            self.g, converted.g, flag, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def idealcoprime(self, left, right):
        cdef Gen converted_left
        cdef Gen converted_right
        cdef GEN result = NULL
        cdef long errnum = 0

        if self.g == NULL or typ(self.g) != t_VEC:
            raise TypeError("PARI ideal operations require a number field")
        if not isinstance(left, Gen) and hasattr(left, "pari_hnf"):
            left = left.pari_hnf()
        if not isinstance(right, Gen) and hasattr(right, "pari_hnf"):
            right = right.pari_hnf()
        converted_left = objtogen(left)
        converted_right = objtogen(right)
        if not cowasm_cypari2_gen_clone_idealcoprime(
            self.g, converted_left.g, converted_right.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def idealfactor(self, ideal):
        cdef Gen converted
        cdef GEN result = NULL
        cdef long errnum = 0

        if self.g == NULL or typ(self.g) != t_VEC:
            raise TypeError("PARI ideal operations require a number field")
        if not isinstance(ideal, Gen) and hasattr(ideal, "pari_hnf"):
            ideal = ideal.pari_hnf()
        converted = objtogen(ideal)
        if not cowasm_cypari2_gen_clone_idealfactor(
            self.g, converted.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def idealchinese(self, factors, residues=None):
        cdef Gen converted_factors
        cdef Gen converted_residues
        cdef GEN residue_gen = NULL
        cdef GEN result = NULL
        cdef long errnum = 0

        if self.g == NULL or typ(self.g) != t_VEC:
            raise TypeError("PARI ideal operations require a number field")
        converted_factors = objtogen(factors)
        if residues is not None:
            converted_residues = objtogen(residues)
            residue_gen = converted_residues.g
        if not cowasm_cypari2_gen_clone_idealchinese(
            self.g, converted_factors.g, residue_gen, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def idealintersect(self, left, right):
        cdef Gen converted_left
        cdef Gen converted_right
        cdef GEN result = NULL
        cdef long errnum = 0

        if self.g == NULL or typ(self.g) != t_VEC:
            raise TypeError("PARI ideal operations require a number field")
        if not isinstance(left, Gen) and hasattr(left, "pari_hnf"):
            left = left.pari_hnf()
        if not isinstance(right, Gen) and hasattr(right, "pari_hnf"):
            right = right.pari_hnf()
        converted_left = objtogen(left)
        converted_right = objtogen(right)
        if not cowasm_cypari2_gen_clone_idealintersect(
            self.g, converted_left.g, converted_right.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def idealinv(self, ideal):
        cdef Gen converted
        cdef GEN result = NULL
        cdef long errnum = 0

        if self.g == NULL or typ(self.g) != t_VEC:
            raise TypeError("PARI ideal operations require a number field")
        if not isinstance(ideal, Gen) and hasattr(ideal, "pari_hnf"):
            ideal = ideal.pari_hnf()
        converted = objtogen(ideal)
        if not cowasm_cypari2_gen_clone_idealinv(
            self.g, converted.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def idealismaximal(self, ideal):
        cdef Gen converted
        cdef GEN result = NULL
        cdef long errnum = 0

        if self.g == NULL or typ(self.g) != t_VEC:
            raise TypeError("PARI ideal operations require a number field")
        if not isinstance(ideal, Gen) and hasattr(ideal, "pari_hnf"):
            ideal = ideal.pari_hnf()
        converted = objtogen(ideal)
        if not cowasm_cypari2_gen_clone_idealismaximal(
            self.g, converted.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def idealispower(self, ideal, long exponent, B=None):
        cdef Gen converted
        cdef long result = 0
        cdef long errnum = 0

        if B is not None:
            raise NotImplementedError("optional argument B not available")
        if self.g == NULL or typ(self.g) != t_VEC:
            raise TypeError("PARI ideal operations require a number field")
        if not isinstance(ideal, Gen) and hasattr(ideal, "pari_hnf"):
            ideal = ideal.pari_hnf()
        converted = objtogen(ideal)
        if not cowasm_cypari2_gen_idealispower(
            self.g, converted.g, exponent, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return result

    def idealnumden(self, ideal):
        cdef Gen converted
        cdef GEN result = NULL
        cdef long errnum = 0

        if self.g == NULL or typ(self.g) != t_VEC:
            raise TypeError("PARI ideal operations require a number field")
        if not isinstance(ideal, Gen) and hasattr(ideal, "pari_hnf"):
            ideal = ideal.pari_hnf()
        converted = objtogen(ideal)
        if not cowasm_cypari2_gen_clone_idealnumden(
            self.g, converted.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def idealred(self, ideal):
        cdef Gen converted
        cdef GEN result = NULL
        cdef long errnum = 0

        if self.g == NULL or typ(self.g) != t_VEC:
            raise TypeError("PARI ideal operations require a number field")
        if not isinstance(ideal, Gen) and hasattr(ideal, "pari_hnf"):
            ideal = ideal.pari_hnf()
        converted = objtogen(ideal)
        if not cowasm_cypari2_gen_clone_idealred(
            self.g, converted.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def idealtwoelt(self, ideal):
        cdef Gen converted
        cdef GEN result = NULL
        cdef long errnum = 0

        if self.g == NULL or typ(self.g) != t_VEC:
            raise TypeError("PARI ideal operations require a number field")
        if not isinstance(ideal, Gen) and hasattr(ideal, "pari_hnf"):
            ideal = ideal.pari_hnf()
        converted = objtogen(ideal)
        if not cowasm_cypari2_gen_clone_idealtwoelt(
            self.g, converted.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def idealval(self, ideal, prime):
        cdef Gen converted_ideal
        cdef Gen converted_prime
        cdef GEN result = NULL
        cdef long errnum = 0

        if self.g == NULL or typ(self.g) != t_VEC:
            raise TypeError("PARI ideal operations require a number field")
        if not isinstance(ideal, Gen) and hasattr(ideal, "pari_hnf"):
            ideal = ideal.pari_hnf()
        converted_ideal = objtogen(ideal)
        converted_prime = objtogen(prime)
        if not cowasm_cypari2_gen_clone_idealval(
            self.g, converted_ideal.g, converted_prime.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def idealmul(self, left, right):
        cdef Gen converted_left
        cdef Gen converted_right
        cdef GEN result = NULL
        cdef long errnum = 0

        if self.g == NULL or typ(self.g) != t_VEC:
            raise TypeError("PARI ideal operations require a number field")
        if not isinstance(left, Gen) and hasattr(left, "pari_hnf"):
            left = left.pari_hnf()
        if not isinstance(right, Gen) and hasattr(right, "pari_hnf"):
            right = right.pari_hnf()
        converted_left = objtogen(left)
        converted_right = objtogen(right)
        if not cowasm_cypari2_gen_clone_idealmul(
            self.g, converted_left.g, converted_right.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def idealdiv(self, left, right):
        cdef Gen converted_left
        cdef Gen converted_right
        cdef GEN result = NULL
        cdef long errnum = 0

        if self.g == NULL or typ(self.g) != t_VEC:
            raise TypeError("PARI ideal operations require a number field")
        if not isinstance(left, Gen) and hasattr(left, "pari_hnf"):
            left = left.pari_hnf()
        if not isinstance(right, Gen) and hasattr(right, "pari_hnf"):
            right = right.pari_hnf()
        converted_left = objtogen(left)
        converted_right = objtogen(right)
        if not cowasm_cypari2_gen_clone_idealdiv(
            self.g, converted_left.g, converted_right.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def idealpow(self, ideal, exponent):
        cdef Gen converted_ideal
        cdef Gen converted_exponent
        cdef GEN result = NULL
        cdef long errnum = 0

        if self.g == NULL or typ(self.g) != t_VEC:
            raise TypeError("PARI ideal operations require a number field")
        if not isinstance(ideal, Gen) and hasattr(ideal, "pari_hnf"):
            ideal = ideal.pari_hnf()
        converted_ideal = objtogen(ideal)
        converted_exponent = objtogen(exponent)
        if not cowasm_cypari2_gen_clone_idealpow(
            self.g, converted_ideal.g, converted_exponent.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def idealnorm(self, ideal):
        cdef Gen converted = objtogen(ideal)
        cdef GEN result = NULL
        cdef long errnum = 0

        if self.g == NULL or typ(self.g) != t_VEC:
            raise TypeError("PARI ideal operations require a number field")
        if not cowasm_cypari2_gen_clone_idealnorm(
            self.g, converted.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def nf_get_sign(self):
        cdef long r1 = 0
        cdef long r2 = 0
        cdef long errnum = 0

        if not cowasm_cypari2_gen_nf_sign(self.g, &r1, &r2, &errnum):
            _raise_pari_error(errnum)
        return [r1, r2]

    def getattr(self, attr):
        if attr in ("zk", b"zk"):
            return self.nf_get_zk()
        return _missing_runtime(attr)

    def change_variable_name(self, variable):
        cdef bytes encoded
        cdef GEN result = NULL
        cdef int unchanged = 0
        cdef long errnum = 0

        if self.g == NULL or typ(self.g) not in (t_POL, t_SER):
            raise TypeError(
                "set_variable() only works for polynomials or power series"
            )
        encoded = str(variable).encode("ascii")
        if not cowasm_cypari2_gen_change_variable_name(
            self.g, <const char *>encoded, &result, &unchanged, &errnum
        ):
            _raise_pari_error(errnum)
        if unchanged:
            return self
        return _new_owned(result)

    def simplify(self):
        cdef GEN result = NULL
        cdef long errnum = 0

        if self.g != NULL and typ(self.g) in (t_INT, t_FRAC):
            return self
        if not cowasm_cypari2_gen_clone_simplify(
            self.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def lift(self):
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_lift(self.g, &result, &errnum):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def Mod(self, modulus):
        cdef Gen converted = objtogen(modulus)
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_mod(
            self.g, converted.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def mod(self):
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_modulus(
            self.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def modreverse(self):
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_modreverse(self.g, &result, &errnum):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def Polrev(self, _variable=None):
        cdef bytes encoded
        cdef const char *variable = NULL
        cdef GEN result = NULL
        cdef long errnum = 0

        if _variable is not None:
            encoded = str(_variable).encode("ascii")
            variable = <const char *>encoded
        if not cowasm_cypari2_gen_clone_polrev(
            self.g, variable, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def factor(self, long limit=-1, proof=None):
        cdef GEN result = NULL
        cdef long errnum = 0
        cdef int has_proof = 0
        cdef int proof_value = 0

        if limit != -1:
            _missing_runtime()
        if proof is not None:
            has_proof = 1
            proof_value = 1 if proof else 0

        if not cowasm_cypari2_gen_clone_factor(
            self.g, has_proof, proof_value, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def nextprime(self, bint add_one=False):
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_nextprime(
            self.g, 1 if add_one else 0, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def znorder(self, o=None):
        cdef GEN result = NULL
        cdef long errnum = 0
        cdef Gen multiple
        cdef GEN multiple_gen = NULL
        cdef int has_multiple = 0

        if o is not None:
            multiple = objtogen(o)
            multiple_gen = multiple.g
            has_multiple = 1

        if not cowasm_cypari2_gen_clone_znorder(
            self.g, multiple_gen, has_multiple, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def eulerphi(self):
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_eulerphi(self.g, &result, &errnum):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def ispseudoprime(self, long flag=0):
        cdef long result = 0
        cdef long errnum = 0

        if not cowasm_cypari2_gen_ispseudoprime(
            self.g, flag, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return bool(result)

    def isprime(self):
        cdef long result = 0
        cdef long errnum = 0

        if not cowasm_cypari2_gen_isprime(self.g, &result, &errnum):
            _raise_pari_error(errnum)
        return bool(result)

    def isprimepower(self):
        return self._primepower(True)

    def ispseudoprimepower(self):
        return self._primepower(False)

    def _primepower(self, bint proven):
        cdef GEN result = NULL
        cdef long errnum = 0
        cdef long power = 0

        if not cowasm_cypari2_gen_clone_primepower(
            self.g, 1 if proven else 0, &power, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return int(power), _new_owned(result)

    def ispower(self, k=None):
        cdef GEN result = NULL
        cdef long errnum = 0
        cdef long power = 0
        cdef Gen exponent

        if k is None:
            if not cowasm_cypari2_gen_clone_ispower(
                self.g, NULL, 0, &power, &result, &errnum
            ):
                _raise_pari_error(errnum)
            return int(power), _new_owned(result)

        exponent = objtogen(k)
        if not cowasm_cypari2_gen_clone_ispower(
            self.g, exponent.g, 1, &power, &result, &errnum
        ):
            _raise_pari_error(errnum)
        if power == 0:
            return False, None
        return k, _new_owned(result)

    def ffinit(self, long degree):
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_ffinit(self.g, degree, &result, &errnum):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def ffgen(self):
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_ffgen(self.g, &result, &errnum):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def fffrobenius(self, long n=1):
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_fffrobenius(
            self.g, n, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def ffcompomap(self, other):
        cdef Gen converted = objtogen(other)
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_ffcompomap(
            self.g, converted.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    def ffmap(self, value):
        cdef Gen converted = objtogen(value)
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_ffmap(
            self.g, converted.g, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    cdef Gen new_ref(self, GEN g):
        return _new_clone(g)

    cdef GEN fixGEN(self) except NULL:
        return self.g

    cdef GEN ref_target(self) except NULL:
        return self.g


cpdef Gen objtogen(s):
    cdef bytes encoded
    cdef GEN result = NULL
    cdef long errnum = 0
    cdef object pari_method
    cdef object pari_value
    cdef str text
    cdef list converted
    cdef object rational_parts

    if isinstance(s, Gen):
        return <Gen>s

    if isinstance(s, (list, tuple)):
        converted = [objtogen(x) for x in s]
        return list_of_Gens_to_Gen(converted)

    rational_parts = _exact_rational_parts(s)
    if rational_parts is not None:
        text = f"{rational_parts[0]}/{rational_parts[1]}"
        encoded = text.encode("ascii")
        if not cowasm_cypari2_gen_clone_expression(
            <const char *>encoded, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    text = str(s)
    encoded = text.encode("ascii")
    if _is_integer_text(text):
        if not cowasm_cypari2_gen_clone_integer(
            <const char *>encoded, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    if isinstance(s, str):
        if not cowasm_cypari2_gen_clone_expression(
            <const char *>encoded, &result, &errnum
        ):
            _raise_pari_error(errnum)
        return _new_owned(result)

    # Sage extension types expose their native PARI value through this hook.
    # Keep the focused built-in conversions above, then accept only the real
    # Gen contract here rather than stringifying arbitrary Python objects.
    # Some Sage hooks import cypari2 converter modules outside this focused
    # profile; treat those as unavailable so callers retain the established
    # NotImplementedError fallback contract.
    pari_method = getattr(s, "__pari__", None)
    if pari_method is not None:
        try:
            pari_value = pari_method()
        except ImportError:
            pass
        else:
            if not isinstance(pari_value, Gen):
                raise TypeError("__pari__() must return a cypari2 Gen")
            return <Gen>pari_value

    _missing_runtime()


cpdef Gen prime(long n):
    cdef GEN result = NULL
    cdef long errnum = 0

    if not cowasm_cypari2_gen_clone_prime(n, &result, &errnum):
        _raise_pari_error(errnum)
    return _new_owned(result)


cdef Gen list_of_Gens_to_Gen(list s):
    cdef Py_ssize_t length = len(s)
    cdef Py_ssize_t i
    cowasm_cypari2_gen_ensure_pari()
    cdef GEN vector = cgetg(length + 1, t_VEC)

    for i in range(length):
        set_gel(vector, i + 1, (<Gen>s[i]).g)
    return _new_owned(gclone(vector))
PYX

PYTHONPATH="$py_cython" python3 -m cython -3 \
  --module-name cypari2.gen \
  -I "$dist_dir" \
  -I "$dist_dir/cypari2" \
  -I "$pari_wasi_sdk/include" \
  --output-file "$probe_dir/gen.c" \
  "$probe_dir/gen.pyx"

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
  -Wl,--export=PyInit_gen \
  -I"$python_include" \
  -I"$dist_dir/cypari2" \
  -I"$posix_wasi_sdk" \
  -I"$pari_wasi_sdk/include" \
  -I"$gmp_wasi_sdk/include" \
  "$probe_dir/gen.c" \
  "$pari_wasi_sdk/lib/libpari.a" \
  "$gmp_wasi_sdk/lib/libgmp.a" \
  "$setjmp_lib" \
  -lm \
  -o "$dist_dir/cypari2/gen$extension_suffix"

audit_cpython_side_module "$dist_dir/cypari2/gen$extension_suffix" PyInit_gen

cat >"$probe_dir/stack.pyx" <<'PYX'
"""Focused CoWasm runtime subset for cypari2.stack.

The upstream cypari2 stack module tracks PARI stack ownership precisely. The
current CoWasm runtime subset returns borrowed wrappers instead. Sage's PARI
FFELT side module has its own linked PARI runtime, so cloning or freeing those
GENs from this module crosses PARI heap ownership boundaries and can corrupt
memory.
"""

from .types cimport GEN, pari_sp
from .gen cimport Gen


cdef Gen _new_borrowed(GEN g):
    cdef Gen z = <Gen>Gen.__new__(Gen)
    z.g = g
    z.address = NULL
    z.next = None
    z.itemcache = None
    return z


cdef Gen new_gen(GEN x):
    return _new_borrowed(x)


cdef new_gens2(GEN x, GEN y):
    return new_gen(x), new_gen(y)


cdef Gen new_gen_noclear(GEN x):
    return _new_borrowed(x)


cdef Gen clone_gen(GEN x):
    return _new_borrowed(x)


cdef Gen clone_gen_noclear(GEN x):
    return _new_borrowed(x)


cdef void clear_stack() noexcept:
    pass


cdef void reset_avma() noexcept:
    pass


cdef void remove_from_pari_stack(Gen self) noexcept:
    pass


cdef int move_gens_to_heap(pari_sp lim) except -1:
    return 0


cdef int before_resize() except -1:
    return 0


cdef int set_pari_stack_size(size_t size, size_t sizemax) except -1:
    return 0


cdef void after_resize() noexcept:
    pass


cdef class DetachGen:
    cdef GEN detach(self) except NULL:
        if isinstance(self.source, Gen):
            return (<Gen>self.source).g
        return NULL
PYX

PYTHONPATH="$py_cython:$dist_dir" python3 -m cython -3 \
  --module-name cypari2.stack \
  -I "$dist_dir" \
  -I "$dist_dir/cypari2" \
  -I "$pari_wasi_sdk/include" \
  --output-file "$probe_dir/stack.c" \
  "$probe_dir/stack.pyx"

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
  -Wl,--export=PyInit_stack \
  -I"$python_include" \
  -I"$dist_dir/cypari2" \
  -I"$posix_wasi_sdk" \
  -I"$pari_wasi_sdk/include" \
  -I"$gmp_wasi_sdk/include" \
  "$probe_dir/stack.c" \
  "$pari_wasi_sdk/lib/libpari.a" \
  "$gmp_wasi_sdk/lib/libgmp.a" \
  "$setjmp_lib" \
  -lm \
  -o "$dist_dir/cypari2/stack$extension_suffix"

audit_cpython_side_module "$dist_dir/cypari2/stack$extension_suffix" PyInit_stack

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
from cypari2.paridecl cimport GEN, GENtostr, gp_read_str, itos, pari_free


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

    static int cowasm_cypari2_cython_is_inverse_error(long errnum) {
      return errnum == e_INV;
    }

    static int cowasm_cypari2_cython_eval_string(const char *expression,
                                                 char **result,
                                                 long *errnum) {
      int ok = 1;

      *result = NULL;
      *errnum = 0;
      cowasm_cypari2_cython_ensure_pari();

      pari_CATCH(CATCH_ALL) {
        GEN error = pari_err_last();
        *errnum = error ? err_get_num(error) : CATCH_ALL;
        ok = 0;
      }
      pari_TRY {
        GEN value = gp_read_str(expression);
        *result = GENtostr(value);
      }
      pari_ENDCATCH;

      return ok;
    }
    """
    void cowasm_cypari2_cython_ensure_pari()
    int cowasm_cypari2_cython_check_error_recovery(long *result)
    int cowasm_cypari2_cython_is_inverse_error(long errnum)
    int cowasm_cypari2_cython_eval_string(const char *expression,
                                          char **result,
                                          long *errnum)


cpdef long eval_long(str expression) except -1:
    cdef bytes encoded = expression.encode("ascii")
    cdef GEN value

    cowasm_cypari2_cython_ensure_pari()
    value = gp_read_str(<const char *>encoded)
    return itos(value)


cpdef str eval_string(str expression):
    cdef bytes encoded = expression.encode("ascii")
    cdef char *output = NULL
    cdef long errnum = 0

    if not cowasm_cypari2_cython_eval_string(
        <const char *>encoded, &output, &errnum
    ):
        from cypari2.handle_error import PariError
        if cowasm_cypari2_cython_is_inverse_error(errnum):
            raise PariError("impossible inverse in gdiv: 0")
        raise PariError(f"PARI error {errnum}")

    try:
        return output.decode("ascii")
    finally:
        if output != NULL:
            pari_free(output)


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


PariError.__module__ = "builtins"
PY

cat >"$dist_dir/cypari2/pari_instance.py" <<'PY'
"""Minimal CoWasm PARI runtime wrapper for cypari2.pari_instance.

This is not the full upstream cypari2 ``Pari``/``Gen`` object model yet. It
routes strings and exact integers through the focused ``cypari2.gen`` runtime
subset so Sagelite can exercise real PARI arithmetic and integer
factorization while unsupported conversion and method paths still fail closed.
"""

from .gen import (
    _missing_runtime,
    eval_string,
    get_random_state,
    get_debug_level,
    objtogen,
    prime as _prime,
    set_random_state,
    set_debug_level,
)


class PariValue:
    def __init__(self, text):
        self._text = text

    def __repr__(self):
        return self._text

    def __str__(self):
        return self._text

    def __eq__(self, other):
        if isinstance(other, PariValue):
            return self._text == other._text
        return self._text == str(other)


class Pari:
    def __init__(self, stack_initial=None, stack_max=None):
        self.stack_initial = stack_initial
        self.stack_max = stack_max

    def default(self, key, value=None):
        if key == "debug":
            if value is None:
                return get_debug_level()
            set_debug_level(int(value))
            return None
        if value is None:
            _missing_runtime()
        return None

    def get_debug_level(self):
        return get_debug_level()

    def set_debug_level(self, level):
        set_debug_level(int(level))

    def prime(self, n):
        return _prime(int(n))

    def getrand(self):
        return get_random_state()

    def setrand(self, seed):
        set_random_state(seed)

    def Mat(self, value):
        return objtogen(value).Mat()

    def Col(self, value):
        return objtogen(value).Col()

    def matrix(self, rows, columns, entries):
        rows = int(rows)
        columns = int(columns)
        if rows <= 0 or columns <= 0:
            raise ValueError("matrix dimensions must be positive")
        try:
            values = list(entries)
        except TypeError:
            return _missing_runtime(rows, columns, entries)
        if len(values) != rows * columns:
            raise ValueError("matrix entry count does not match its dimensions")
        return self.Mat([
            self.Col(values[row * columns:(row + 1) * columns])
            for row in range(rows)
        ]).mattranspose()

    def __call__(self, *args, **kwargs):
        if kwargs or len(args) != 1:
            return _missing_runtime(*args, **kwargs)
        expression = args[0]
        return objtogen(expression)

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
from fractions import Fraction
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
assert PariError.__module__ == "builtins"
assert str(objtogen([1, 2, 3])) == "[1, 2, 3]"
assert str(objtogen([1, 2, 3]).Polrev()) == "3*x^2 + 2*x + 1"
assert str(objtogen([1, 2, 3]).Polrev("t")) == "3*t^2 + 2*t + 1"
f = objtogen("y^2 - 2")
y = f.variable()
assert str(y) == "y"
assert int(f.poldegree()) == 2
assert int(y.poldegree()) == 1
assert int(objtogen(7).poldegree()) == 0
assert [str(variable) for variable in f.variables()] == ["y"]
assert objtogen(7).variables() == []
assert int(f.poldegree(f.variables()[0])) == 2
assert int(f.pollead()) == 1
assert int(objtogen("2*y^2 - 2").pollead(y)) == 2
assert int(objtogen(7).pollead()) == 7
assert int(objtogen("6*y^2 - 4").content()) == 2
assert int(objtogen("7/12").denominator()) == 12
assert f.polisirreducible()
assert not objtogen("y^2 - 1").polisirreducible()
assert str(objtogen("Mod(y, y^2 + 1) + Mod(2, 3)").liftpol()) == (
    "y + Mod(2, 3)"
)
assert [int(f[index]) for index in (0, 1, 2, 100, -1)] == [-2, 0, 1, 0, 0]
assert int(f(objtogen(3))) == 7
assert str(y * 2) == "2*y"
assert str(2 * y) == "2*y"
assert f.poldegree() > 1
assert f.poldegree() >= 2
assert f.poldegree() == 2
assert f.poldegree() != 3
assert f.poldegree() <= 2
assert f.poldegree() < 3
try:
    objtogen([0]) <= objtogen(0)
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("unordered PARI values were accepted by rich comparison")
assert str(objtogen("13*17")) == "221"
assert f.change_variable_name("y") is f
renamed = f.change_variable_name("x")
assert str(renamed) == "x^2 - 2"
assert renamed is not f
assert str(f) == "y^2 - 2"
quartic = objtogen("y^4 - 3*y + 7")
quartic_basis = quartic.nfbasis()
assert str(quartic_basis) == "[1, y, y^2, y^3]"
quartic_nf = objtogen([quartic, quartic_basis]).nfinit()
assert len(quartic_nf) == 9
assert str(quartic_nf[0]) == "y^4 - 3*y + 7"
assert str(quartic_nf[1]) == "[0, 2]"
assert int(quartic_nf[2]) == 85621
assert int(quartic_nf[3]) == 1
assert str(quartic_nf[:4]) == "[y^4 - 3*y + 7, [0, 2], 85621, 1]"
quartic_diff = quartic_nf.nf_get_diff()
assert quartic_diff.nrows() == 4
assert quartic_diff.ncols() == 4
assert [
    [int(quartic_diff[row, column]) for column in range(4)]
    for row in range(4)
] == [
    [85621, 66591, 35930, 14526],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
]
assert str(quartic_nf.nf_get_zk() * quartic_diff) == (
    "[85621, y + 66591, y^2 + 35930, y^3 + y^2 + 14524]"
)
quartic_different_basis = quartic_nf.nf_get_zk() * quartic_diff
assert [
    int(value.poldegree(value.variables()[0])) if value.variables() else 0
    for value in quartic_different_basis
] == [0, 1, 2, 3]
zero_ideal = quartic_nf.idealhnf(0)
unit_ideal = quartic_nf.idealhnf(1)
two_ideal = quartic_nf.idealhnf(2)
class IdealLike:
    def __init__(self, hnf):
        self._hnf = hnf

    def pari_hnf(self):
        return self._hnf

assert str(zero_ideal) == '[;]'
assert unit_ideal.nrows() == unit_ideal.ncols() == 4
assert [
    [int(unit_ideal[row, column]) for column in range(4)]
    for row in range(4)
] == [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
]
assert str(quartic_nf.idealadd(zero_ideal, two_ideal)) == str(two_ideal)
three_ideal = quartic_nf.idealhnf(3)
add_to_one = quartic_nf.idealaddtoone(two_ideal, three_ideal)
assert str(add_to_one) == (
    "[[-2, 0, 0, 0]~, [3, 0, 0, 0]~]"
)
assert str(add_to_one[0]) == "[-2, 0, 0, 0]~"
assert str(add_to_one[1]) == "[3, 0, 0, 0]~"
assert str(quartic_nf.nfbasistoalg_lift(add_to_one[0])) == "-2"
assert str(quartic_nf.nfbasistoalg_lift(add_to_one[1])) == "3"
assert str(
    quartic_nf.idealaddtoone(IdealLike(two_ideal), IdealLike(three_ideal))
) == str(add_to_one)
twelve_ideal = quartic_nf.idealhnf(12)
coprime_multiplier = quartic_nf.idealcoprime(twelve_ideal, two_ideal)
assert str(coprime_multiplier) == "1/4"
coprime_product = quartic_nf.idealmul(coprime_multiplier, twelve_ideal)
assert str(coprime_product) == str(three_ideal)
assert int(quartic_nf.idealnorm(coprime_product)) == 81
assert str(
    quartic_nf.idealcoprime(IdealLike(twelve_ideal), IdealLike(two_ideal))
) == str(coprime_multiplier)
twelve_factorization = quartic_nf.idealfactor(twelve_ideal)
assert twelve_factorization.nrows() == 3
assert twelve_factorization.ncols() == 2
assert [int(twelve_factorization[row, 1]) for row in range(3)] == [2, 1, 1]
first_prime = twelve_factorization[0, 0]
assert str(first_prime.pr_get_p()) == "2"
assert str(first_prime.pr_get_gen()) == "[2, 0, 0, 0]~"
assert int(first_prime.pr_get_e()) == 1
assert int(first_prime.pr_get_f()) == 4
assert str(quartic_nf.idealfactor(IdealLike(twelve_ideal))) == str(
    twelve_factorization
)
assert int(objtogen("x^3 + x^2 - 2*x + 8").nfdisc()) == -503
assert int(objtogen("x^2 - 1/2").nfdisc()) == 8
quartic_roots_of_unity = quartic_nf.nfrootsof1()
assert int(quartic_roots_of_unity[0]) == 2
assert str(quartic_roots_of_unity[1]) == "-1"
gaussian_roots_of_unity = objtogen("x^2 + 1").nfinit().nfrootsof1()
assert int(gaussian_roots_of_unity[0]) == 4
assert str(gaussian_roots_of_unity[1]) == "[0, 1]~"
gaussian_zeta_coefficients = objtogen("x^2 + 1").nfinit().dirzetak(10)
assert [int(value) for value in gaussian_zeta_coefficients] == [
    1, 1, 0, 1, 2, 0, 0, 1, 1, 2
]
quadratic_conjugates = objtogen("x^2 + 10000").nfinit().nfgaloisconj()
assert str(quadratic_conjugates) == "[-x, x]~"
assert str(objtogen("x^2 + 10000").nfinit().nfgaloisconj(
    flag=0, d=-40000, precision=128
)) == "[-x, x]~"
assert str(objtogen("x^3 + 2").nfinit().nfgaloisconj()) == "[x]~"
assert str(objtogen("x^4 + 2").nfinit().nfgaloisconj()) == "[-x, x]~"
quartic_subfields = objtogen("x^4 - 2").nfsubfields()
assert str(quartic_subfields) == (
    "[[x, 0], [x^2 - 2, -x^2], [x^4 - 2, x]]"
)
assert str(objtogen("x^4 - 2").nfsubfields(2)) == "[[x^2 - 2, -x^2]]"
assert str(objtogen("x^3 - 3*x + 1").nfsubfields()) == (
    "[[x, 0], [x^3 - 3*x + 1, x]]"
)
gaussian_nf = objtogen("y^2 + 1").nfinit()
gaussian_quadratic_factors = gaussian_nf.nffactor(objtogen("x^2 + 1"))
assert gaussian_quadratic_factors.nrows() == 2
assert gaussian_quadratic_factors.ncols() == 2
assert [str(gaussian_quadratic_factors[row, 0]) for row in range(2)] == [
    "x + Mod(-y, y^2 + 1)", "x + Mod(y, y^2 + 1)"
]
assert [int(gaussian_quadratic_factors[row, 1]) for row in range(2)] == [1, 1]
gaussian_quartic_factors = objtogen("y^2 + 1").nffactor(objtogen("x^4 - 1"))
assert gaussian_quartic_factors.nrows() == 4
assert gaussian_quartic_factors.ncols() == 2
assert [str(gaussian_quartic_factors[row, 0]) for row in range(4)] == [
    "x - 1", "x + 1", "x + Mod(-y, y^2 + 1)", "x + Mod(y, y^2 + 1)"
]
assert [int(gaussian_quartic_factors[row, 1]) for row in range(4)] == [1] * 4
gaussian_reduced_relative = gaussian_nf.rnfpolredbest(
    objtogen("x^2 - 1/2"), flag=1
)
assert str(gaussian_reduced_relative) == (
    "[x^2 + Mod(y, y^2 + 1), "
    "Mod(Mod(-1/2*y - 1/2, y^2 + 1)*x, x^2 + Mod(y, y^2 + 1))]"
)
quadratic_reduced_relative = objtogen("y^2 + 2").nfinit().rnfpolredbest(
    objtogen("x^2 - 1/3"), flag=1
)
assert str(quadratic_reduced_relative) == (
    "[x^2 + Mod(y, y^2 + 2)*x + 1, "
    "Mod(Mod(-1/3*y, y^2 + 2)*x + Mod(1/3, y^2 + 2), "
    "x^2 + Mod(y, y^2 + 2)*x + 1)]"
)
gaussian_rnf = gaussian_nf.rnfinit(objtogen("x^2 - y"))
assert gaussian_rnf.length() == 12
assert str(gaussian_rnf[0]) == "x^2 - y"
assert str(gaussian_rnf[2]) == "[4, [0, 1]~]"
assert str(gaussian_rnf[4]) == "[2]"
assert str(gaussian_rnf[11]) == "[0, 0]"
gaussian_rnf_with_absolute = gaussian_nf.rnfinit(
    objtogen("x^2 - y"), flag=1
)
assert gaussian_rnf_with_absolute.length() == 12
assert gaussian_rnf_with_absolute[11].length() == 2
gaussian_relative_equation = objtogen("y^2 + 1")._nf_rnfeq(
    objtogen("x^2 + 2")
)
assert str(gaussian_relative_equation) == (
    "[x^4 + 6*x^2 + 1, 1/2*x^3 + 5/2*x, -1, y^2 + 1, x^2 + 2]"
)
gaussian_nfzk = gaussian_nf._nf_nfzk(gaussian_relative_equation)
assert str(gaussian_nfzk) == "[2, x^3 + 5*x]"
assert str(gaussian_nf._nfeltup(objtogen("y"), gaussian_nfzk)) == (
    "1/2*x^3 + 5/2*x"
)
assert str(gaussian_relative_equation._eltabstorel_lift(objtogen("x"))) == (
    "x + Mod(-y, y^2 + 1)"
)
assert str(
    gaussian_relative_equation._eltabstorel_lift(objtogen("x")).Vecrev(2)
) == "[Mod(-y, y^2 + 1), 1]"
gaussian_absolute_base_value = gaussian_nf._nfeltup(
    objtogen("y + 1/2"), gaussian_nfzk
)
gaussian_base_value = gaussian_relative_equation._eltabstorel_lift(
    gaussian_absolute_base_value
).lift()
assert gaussian_base_value.type() == "t_POL"
assert str(gaussian_base_value.variable()) == "x"
assert str(gaussian_base_value) == "(y + 1/2)"
gaussian_base_value = gaussian_base_value.simplify()
assert gaussian_base_value.type() == "t_POL"
assert str(gaussian_base_value.variable()) == "y"
assert str(gaussian_base_value) == "y + 1/2"
assert str(gaussian_relative_equation._eltreltoabs(objtogen("x"))) == (
    "1/2*x^3 + 7/2*x"
)
assert str(gaussian_relative_equation._eltreltoabs(objtogen("y"))) == (
    "1/2*x^3 + 5/2*x"
)
isomorphic_cubic = objtogen("x^3 - 2")
same_cubic_isomorphisms = isomorphic_cubic.nfisisom(objtogen("y^3 - 2"))
scaled_cubic_isomorphisms = isomorphic_cubic.nfisisom(objtogen("y^3 - 4"))
nonisomorphic_quadratic = isomorphic_cubic.nfisisom(objtogen("y^2 - 2"))
assert str(same_cubic_isomorphisms) == "[y]"
assert same_cubic_isomorphisms.length() == 1
assert str(scaled_cubic_isomorphisms) == "[1/2*y^2]"
assert scaled_cubic_isomorphisms.length() == 1
assert not nonisomorphic_quadratic
assert nonisomorphic_quadratic.length() == 0
bounded_quartic_ideals = quartic_nf.ideallist(5)
assert len(bounded_quartic_ideals) == 5
assert [len(bounded_quartic_ideals[index]) for index in range(5)] == [
    1, 0, 0, 0, 1
]
assert str(bounded_quartic_ideals[0][0]) == str(unit_ideal)
assert int(quartic_nf.idealnorm(bounded_quartic_ideals[4][0])) == 5
assert quartic_nf.nfeltval(12, first_prime) == 2
assert quartic_nf.nfeltval(3, first_prime) == 0
assert quartic_nf.nfeltval(objtogen("4*y"), first_prime) == 2
pari = Pari()
rebuilt_factorization = pari.Mat([
    pari.Col([twelve_factorization[row, 0], twelve_factorization[row, 1]])
    for row in range(3)
]).mattranspose()
assert str(rebuilt_factorization) == str(twelve_factorization)
matrix_factor_row = pari.matrix(1, 2, [first_prime, -1])
assert matrix_factor_row.nrows() == 1
assert matrix_factor_row.ncols() == 2
assert str(matrix_factor_row[0, 0]) == str(first_prime)
assert int(matrix_factor_row[0, 1]) == -1
try:
    pari.matrix(0, 2, [])
except ValueError as err:
    assert str(err) == "matrix dimensions must be positive"
else:
    raise AssertionError("nonpositive matrix dimensions were accepted")
try:
    pari.matrix(2, 2, [1, 2])
except ValueError as err:
    assert str(err) == "matrix entry count does not match its dimensions"
else:
    raise AssertionError("incomplete matrix entries were accepted")
assert str(quartic_nf.idealappr(matrix_factor_row, 1)) == "1/2"
assert str(quartic_nf.idealappr(twelve_factorization, 1)) == (
    "[-36, 24, 0, 0]~"
)
chinese_residues = [1, 2, 3]
chinese_result = quartic_nf.idealchinese(
    rebuilt_factorization, chinese_residues
)
assert str(chinese_result) == "[5, -4, 4, -4]~"
chinese_init = quartic_nf.idealchinese(rebuilt_factorization)
assert str(quartic_nf.idealchinese(chinese_init, chinese_residues)) == str(
    chinese_result
)
assert str(quartic_nf.idealintersect(unit_ideal, two_ideal)) == str(two_ideal)
assert str(quartic_nf.idealintersect(two_ideal, two_ideal)) == str(two_ideal)
four_ideal = quartic_nf.idealhnf(4)
assert str(quartic_nf.idealintersect(two_ideal, four_ideal)) == str(four_ideal)
assert str(
    quartic_nf.idealintersect(IdealLike(unit_ideal), IdealLike(two_ideal))
) == str(two_ideal)
inverse_two_ideal_direct = quartic_nf.idealinv(two_ideal)
assert str(quartic_nf.idealmul(inverse_two_ideal_direct, two_ideal)) == str(
    unit_ideal
)
assert str(quartic_nf.idealnorm(inverse_two_ideal_direct)) == "1/16"
assert str(quartic_nf.idealinv(IdealLike(two_ideal))) == str(
    inverse_two_ideal_direct
)
first_prime_hnf = quartic_nf.idealhnf(first_prime)
maximal_candidate = quartic_nf.idealismaximal(first_prime_hnf)
assert int(maximal_candidate[0]) == int(first_prime[0])
assert int(maximal_candidate.pr_get_e()) == int(first_prime.pr_get_e())
assert int(maximal_candidate.pr_get_f()) == int(first_prime.pr_get_f())
assert int(quartic_nf.idealismaximal(unit_ideal)) == 0
assert int(quartic_nf.idealismaximal(IdealLike(first_prime_hnf))[0]) == int(
    first_prime[0]
)
eight_ideal = quartic_nf.idealpow(two_ideal, 3)
assert quartic_nf.idealispower(eight_ideal, 3) == 1
assert quartic_nf.idealispower(two_ideal, 3) == 0
assert quartic_nf.idealispower(unit_ideal, 5) == 1
assert quartic_nf.idealispower(IdealLike(eight_ideal), 3) == 1
half_numden = quartic_nf.idealnumden(objtogen("1/2"))
assert str(half_numden) == "[1, 2]"
inverse_two_numden = quartic_nf.idealnumden(inverse_two_ideal_direct)
assert str(inverse_two_numden[0]) == str(unit_ideal)
assert str(inverse_two_numden[1]) == str(two_ideal)
assert str(
    quartic_nf.idealdiv(inverse_two_numden[0], inverse_two_numden[1])
) == str(inverse_two_ideal_direct)
ideal_like_numden = quartic_nf.idealnumden(IdealLike(inverse_two_ideal_direct))
assert str(ideal_like_numden) == str(inverse_two_numden)
assert str(quartic_nf.idealred(twelve_ideal)) == str(unit_ideal)
assert str(quartic_nf.idealred(IdealLike(twelve_ideal))) == str(unit_ideal)
assert unit_ideal.gequal(1)
assert two_ideal.gequal(2)
assert not two_ideal.gequal(3)
twelve_generators = quartic_nf.idealtwoelt(twelve_ideal)
assert int(twelve_generators[0]) == 12
assert str(
    quartic_nf.idealadd(twelve_generators[0], twelve_generators[1])
) == str(twelve_ideal)
assert str(quartic_nf.idealtwoelt(IdealLike(twelve_ideal))) == str(
    twelve_generators
)
assert int(quartic_nf.idealval(twelve_ideal, first_prime)) == 2
assert int(quartic_nf.idealval(unit_ideal, first_prime)) == 0
assert str(quartic_nf.idealval(zero_ideal, first_prime)) == "+oo"
assert int(quartic_nf.idealval(IdealLike(twelve_ideal), first_prime)) == 2
assert str(quartic_nf.idealmul(unit_ideal, two_ideal)) == str(two_ideal)
assert str(
    quartic_nf.idealmul(IdealLike(unit_ideal), IdealLike(two_ideal))
) == str(two_ideal)
assert str(quartic_nf.idealmul(two_ideal, two_ideal)) == str(
    quartic_nf.idealhnf(4)
)
assert int(quartic_nf.idealnorm(quartic_nf.idealmul(two_ideal, two_ideal))) == 256
assert str(quartic_nf.idealdiv(two_ideal, unit_ideal)) == str(two_ideal)
assert str(quartic_nf.idealdiv(two_ideal, two_ideal)) == str(unit_ideal)
inverse_two_ideal = quartic_nf.idealdiv(unit_ideal, two_ideal)
assert str(quartic_nf.idealmul(inverse_two_ideal, two_ideal)) == str(unit_ideal)
assert str(quartic_nf.idealnorm(inverse_two_ideal)) == "1/16"
assert str(
    quartic_nf.idealdiv(IdealLike(two_ideal), IdealLike(two_ideal))
) == str(unit_ideal)
assert str(quartic_nf.idealpow(two_ideal, 0)) == str(unit_ideal)
assert str(quartic_nf.idealpow(two_ideal, 3)) == str(quartic_nf.idealhnf(8))
assert int(quartic_nf.idealnorm(quartic_nf.idealpow(two_ideal, 3))) == 4096
inverse_two_ideal_via_power = quartic_nf.idealpow(two_ideal, -1)
assert str(inverse_two_ideal_via_power) == str(inverse_two_ideal)
assert str(quartic_nf.idealnorm(inverse_two_ideal_via_power)) == "1/16"
assert str(quartic_nf.idealpow(IdealLike(two_ideal), 2)) == str(
    quartic_nf.idealhnf(4)
)
assert int(quartic_nf.idealnorm(unit_ideal)) == 1
assert int(quartic_nf.idealnorm(two_ideal)) == 16
pari = Pari()
saved_random_state = pari.getrand()
pari.setrand(37)
seeded_random_state = pari.getrand()
assert seeded_random_state != saved_random_state
pari.setrand(seeded_random_state)
assert pari.getrand() == seeded_random_state
pari.setrand(saved_random_state)
quadratic = objtogen("y^2 + 23")
quadratic_bnf = quadratic.bnfinit(1)
assert len(quadratic_bnf) == 10
assert quadratic_bnf.bnfcertify() == 1
quadratic_nf = objtogen([quadratic, quadratic.nfbasis()]).nfinit()
quadratic_different_hnf = quadratic_nf.idealhnf(quadratic_nf.nf_get_diff())
quadratic_principal = quadratic_bnf.bnfisprincipal(
    quadratic_different_hnf, 5
)
assert str(quadratic_principal[0]) == "[0]~"
assert not any(quadratic_principal[0])
assert not bool(objtogen(0))
assert bool(objtogen(1))
quadratic_generator_basis = quadratic_bnf.nffactorback(
    quadratic_principal[1]
)
assert str(quadratic_generator_basis) == "[1, 2]~"
assert str(quadratic_bnf.nfbasistoalg(quadratic_generator_basis)) == (
    "Mod(y, y^2 + 23)"
)
assert str(quadratic_bnf.nfbasistoalg(quadratic_generator_basis).mod()) == (
    "y^2 + 23"
)
assert quartic_nf.nf_get_sign() == [0, 2]
assert isinstance(quartic_nf.nf_get_sign(), list)
assert all(isinstance(value, int) for value in quartic_nf.nf_get_sign())
cubic = objtogen("y^3 - 17")
cubic_nf = objtogen([cubic, cubic.nfbasis()]).nfinit()
assert str(cubic_nf.nf_get_zk()) == "[1, 1/3*y^2 - 1/3*y + 1/3, y]"
assert str(cubic_nf.getattr("zk")) == "[1, 1/3*y^2 - 1/3*y + 1/3, y]"
assert str(cubic_nf.getattr(b"zk")) == "[1, 1/3*y^2 - 1/3*y + 1/3, y]"
assert cubic_nf.nf_get_sign() == [1, 1]
try:
    objtogen(1).nf_get_diff()
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("non-number-field different accessor was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).nfeltval(1, first_prime)
except TypeError as err:
    assert str(err) == "PARI element valuations require a number field"
else:
    raise AssertionError("non-number-field element valuation was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).nfdisc()
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("non-polynomial number-field discriminant was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).nfrootsof1()
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("non-number-field root-of-unity input was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).dirzetak(10)
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("non-number-field zeta-series input was accepted")
assert str(objtogen("13*17")) == "221"
try:
    quartic_nf.dirzetak(objtogen("[1, 2]"))
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("nonscalar zeta-series bound was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).nfgaloisconj()
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("non-number-field Galois-conjugate input was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).nfsubfields()
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("non-polynomial subfield input was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen([1, 2]).pollead()
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("vector leading coefficient was accepted")
assert str(objtogen("13*17")) == "221"
try:
    gaussian_nf.nffactor(objtogen(1))
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("non-polynomial number-field factor input was accepted")
assert str(objtogen("13*17")) == "221"
try:
    gaussian_nf.rnfpolredbest(objtogen(1), flag=1)
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("non-polynomial relative reduction input was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).rnfpolredbest(objtogen("x^2 + 1"), flag=1)
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("non-number-field relative reduction was accepted")
assert str(objtogen("13*17")) == "221"
try:
    gaussian_nf.rnfinit(objtogen(1))
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("non-polynomial relative field input was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).rnfinit(objtogen("x^2 + 1"))
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("non-number-field relative field receiver was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen("y^2 + 1")._nf_rnfeq(objtogen(1))
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("non-polynomial relative equation was accepted")
assert str(objtogen("13*17")) == "221"
try:
    gaussian_nf._nfeltup(objtogen("z"), gaussian_nfzk)
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("foreign-variable base-field lift was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).nfisisom(objtogen("x^2 - 2"))
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("non-polynomial isomorphism input was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).ideallist(5)
except TypeError as err:
    assert str(err) == "PARI ideal operations require a number field"
else:
    raise AssertionError("non-number-field ideal listing was accepted")
assert str(objtogen("13*17")) == "221"
try:
    quartic_nf.ideallist(objtogen("[1, 2]"))
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("nonscalar ideal-list bound was accepted")
assert str(objtogen("13*17")) == "221"
try:
    quartic_nf.nfeltval(12, objtogen("[2]"))
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("malformed prime was accepted by nfeltval")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).idealhnf(1)
except TypeError as err:
    assert str(err) == "PARI ideal operations require a number field"
else:
    raise AssertionError("non-number-field ideal HNF was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).idealmul(1, 1)
except TypeError as err:
    assert str(err) == "PARI ideal operations require a number field"
else:
    raise AssertionError("non-number-field ideal multiplication was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).idealintersect(1, 1)
except TypeError as err:
    assert str(err) == "PARI ideal operations require a number field"
else:
    raise AssertionError("non-number-field ideal intersection was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).idealaddtoone(2, 3)
except TypeError as err:
    assert str(err) == "PARI ideal operations require a number field"
else:
    raise AssertionError("non-number-field ideal add-to-one was accepted")
assert str(objtogen("13*17")) == "221"
try:
    quartic_nf.idealaddtoone(two_ideal, two_ideal)
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("noncoprime ideals were accepted by idealaddtoone")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).idealappr(objtogen("[1, -1]"))
except TypeError as err:
    assert str(err) == "PARI ideal operations require a number field"
else:
    raise AssertionError("non-number-field ideal approximation was accepted")
assert str(objtogen("13*17")) == "221"
try:
    quartic_nf.idealappr(objtogen("[2]"))
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("malformed ideal factorization was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).idealcoprime(2, 3)
except TypeError as err:
    assert str(err) == "PARI ideal operations require a number field"
else:
    raise AssertionError("non-number-field ideal coprime multiplier was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen([1, 2]).idealcoprime(2, 3)
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("invalid number field was accepted by idealcoprime")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).idealfactor(12)
except TypeError as err:
    assert str(err) == "PARI ideal operations require a number field"
else:
    raise AssertionError("non-number-field ideal factorization was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen([1]).pr_get_p()
except TypeError as err:
    assert str(err) == "PARI object is not a prime ideal"
else:
    raise AssertionError("non-prime-ideal accessor input was accepted")
assert str(objtogen("13*17")) == "221"
try:
    quartic_nf.idealfactor(zero_ideal)
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("zero ideal factorization was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).idealchinese([], [])
except TypeError as err:
    assert str(err) == "PARI ideal operations require a number field"
else:
    raise AssertionError("non-number-field ideal Chinese remainder was accepted")
assert str(objtogen("13*17")) == "221"
try:
    quartic_nf.idealchinese(twelve_factorization, [1])
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("wrong-length ideal residues were accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).idealinv(1)
except TypeError as err:
    assert str(err) == "PARI ideal operations require a number field"
else:
    raise AssertionError("non-number-field ideal inversion was accepted")
assert str(objtogen("13*17")) == "221"
try:
    quartic_nf.idealinv(zero_ideal)
except PariError as err:
    assert "impossible inverse" in str(err)
else:
    raise AssertionError("zero ideal inversion was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).idealismaximal(1)
except TypeError as err:
    assert str(err) == "PARI ideal operations require a number field"
else:
    raise AssertionError("non-number-field maximal-ideal test was accepted")
assert str(objtogen("13*17")) == "221"
try:
    quartic_nf.idealismaximal(objtogen("[2]"))
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("malformed maximal-ideal test was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).idealispower(1, 2)
except TypeError as err:
    assert str(err) == "PARI ideal operations require a number field"
else:
    raise AssertionError("non-number-field ideal power test was accepted")
assert str(objtogen("13*17")) == "221"
try:
    quartic_nf.idealispower(two_ideal, 0)
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("nonpositive ideal power test was accepted")
assert str(objtogen("13*17")) == "221"
try:
    quartic_nf.idealispower(two_ideal, 3, object())
except NotImplementedError as err:
    assert str(err) == "optional argument B not available"
else:
    raise AssertionError("optional ideal power root output was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).idealnumden(1)
except TypeError as err:
    assert str(err) == "PARI ideal operations require a number field"
else:
    raise AssertionError("non-number-field ideal numerator/denominator was accepted")
assert str(objtogen("13*17")) == "221"
try:
    quartic_nf.idealnumden(objtogen("[1,0,0;0,1,0;0,0,1]"))
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("wrong-dimension ideal numerator/denominator was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).idealred(1)
except TypeError as err:
    assert str(err) == "PARI ideal operations require a number field"
else:
    raise AssertionError("non-number-field ideal reduction was accepted")
assert str(objtogen("13*17")) == "221"
try:
    quartic_nf.idealred(objtogen("[1,0,0;0,1,0;0,0,1]"))
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("wrong-dimension ideal reduction was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).idealtwoelt(1)
except TypeError as err:
    assert str(err) == "PARI ideal operations require a number field"
else:
    raise AssertionError("non-number-field two-generator ideal was accepted")
assert str(objtogen("13*17")) == "221"
try:
    quartic_nf.idealtwoelt(objtogen("[1,0,0;0,1,0;0,0,1]"))
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("wrong-dimension two-generator ideal was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).idealval(1, first_prime)
except TypeError as err:
    assert str(err) == "PARI ideal operations require a number field"
else:
    raise AssertionError("non-number-field ideal valuation was accepted")
assert str(objtogen("13*17")) == "221"
try:
    quartic_nf.idealval(twelve_ideal, objtogen("[2]"))
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("malformed prime ideal was accepted by idealval")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).idealdiv(1, 1)
except TypeError as err:
    assert str(err) == "PARI ideal operations require a number field"
else:
    raise AssertionError("non-number-field ideal division was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).idealpow(1, 2)
except TypeError as err:
    assert str(err) == "PARI ideal operations require a number field"
else:
    raise AssertionError("non-number-field ideal power was accepted")
assert str(objtogen("13*17")) == "221"
try:
    quartic_nf.idealpow(two_ideal, objtogen("y"))
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("non-integral ideal exponent was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).bnfinit(1)
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("non-polynomial BNF initialization was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).bnfcertify()
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("non-BNF certification was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).mod()
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("non-modular modulus access was accepted")
assert str(objtogen("13*17")) == "221"
try:
    objtogen(1).nf_get_sign()
except PariError as err:
    assert str(err).startswith("PARI error ")
else:
    raise AssertionError("non-number-field sign accessor was accepted")
assert str(objtogen("13*17")) == "221"
series = objtogen("1 + 2*y + O(y^10)")
assert str(series.change_variable_name("q")) == "1 + 2*q + O(q^10)"
assert not hasattr(f, "_repr_option")
assert not hasattr(f, "_repr_pretty_")
assert not hasattr(f, "parent")
assert str(y / 6) == "1/6*y"
assert str(6 / y) == "6/y"
alpha = (y / 6).Mod(objtogen("y^2 + 6"))
assert str(alpha) == "Mod(1/6*y, y^2 + 6)"
assert str(alpha.mod()) == "y^2 + 6"
assert str(alpha.modreverse()) == "Mod(6*y, y^2 + 1/6)"
assert int(objtogen(2).Mod(101).mod()) == 101
try:
    objtogen([1, 2, 3]).Polrev("I")
except PariError:
    pass
else:
    raise AssertionError("reserved PARI variable name was accepted")
try:
    f.change_variable_name("I")
except PariError:
    pass
else:
    raise AssertionError("reserved PARI variable name was accepted")
try:
    objtogen(1).change_variable_name("x")
except TypeError as err:
    assert str(err) == "set_variable() only works for polynomials or power series"
else:
    raise AssertionError("non-polynomial variable rename was accepted")

class PariConvertible:
    def __pari__(self):
        return objtogen(37)

class InvalidPariConvertible:
    def __pari__(self):
        return 37

class UnavailablePariConvertible:
    def __pari__(self):
        raise ModuleNotFoundError("focused converter is unavailable")

assert str(objtogen(PariConvertible())) == "37"
try:
    objtogen(InvalidPariConvertible())
except TypeError as err:
    assert str(err) == "__pari__() must return a cypari2 Gen"
else:
    raise AssertionError("invalid __pari__ conversion did not fail closed")
try:
    objtogen(UnavailablePariConvertible())
except NotImplementedError as err:
    assert "focused PARI Gen subset" in str(err)
else:
    raise AssertionError("unavailable __pari__ converter did not fail closed")

assert isinstance(Gen(1), Gen_base)
assert int(Gen(360)) == 360
assert int(Gen(-8)) == -8
five_a = Gen(5)
five_b = Gen(5)
assert five_a.__hash__() == five_b.__hash__()
assert hash(five_a) == hash(five_b)
assert Gen([42, 2, 3]).__hash__() == Gen([42, 2, 3]).__hash__()
assert Pari(1, 2).default("debugmem", 0) is None
assert pari_probe.eval_long("2+3") == 5
assert pari_probe.eval_long("primepi(10000)") == 1229
assert pari_probe.eval_long("factorback(factor(360))") == 360
assert pari_probe.check_error_recovery() == "caught=e_INV recovered=221"
assert pari_probe.eval_long("13*17") == 221
assert pari_cython_probe.eval_long("2+3") == 5
assert pari_cython_probe.eval_long("primepi(10000)") == 1229
assert pari_cython_probe.eval_long("factorback(factor(360))") == 360
assert pari_cython_probe.eval_string("2+3") == "5"
factor_360 = pari_cython_probe.eval_string("factor(360)")
for entry in ("2 3", "3 2", "5 1"):
    assert entry in factor_360
assert pari_cython_probe.check_error_recovery() == "caught=e_INV recovered=221"
assert pari_cython_probe.eval_long("13*17") == 221
pari = Pari()
old_debug = pari.get_debug_level()
pari.set_debug_level(0)
assert pari.get_debug_level() == 0
assert pari.default("debug") == 0
pari.default("debug", old_debug)
assert pari.get_debug_level() == old_debug
assert str(pari("2+3")) == "5"
rational = pari(Fraction(-2, 3))
assert str(rational) == "-2/3"
assert rational.type() == "t_FRAC"
assert rational.simplify() is rational
assert not hasattr(rational, "_rational_")
assert int(pari("-3.0")) == -3
try:
    int(pari("-3.5"))
except TypeError as err:
    assert "Attempt to coerce non-integral real number" in str(err)
else:
    raise AssertionError("non-integral PARI real converted to int")
try:
    int(pari("1e100"))
except PariError as err:
    assert "precision too low in truncr" in str(err)
else:
    raise AssertionError("low-precision PARI real converted to int")
assert int(pari("10^50")) == 10**50
assert int(pari("Pol(3)")) == 3
try:
    int(pari("Mod(x, x^3+x+1)"))
except TypeError as err:
    assert "Unable to coerce PARI x to an Integer" in str(err)
else:
    raise AssertionError("nonconstant PARI polynomial mod converted to int")
assert repr(pari("primepi(10000)")) == "1229"
assert str(pari("factorback(factor(360))")) == "360"
g = pari(360)
assert isinstance(g, Gen)
assert int(g) == 360
F = g.factor()
assert F.ncols() == 2
assert F.nrows() == 3
product = 1
for i in range(F.nrows()):
    product *= int(F[i, 0]) ** int(F[i, 1])
assert product == 360
p, e = F
assert [int(p[i]) for i in range(len(p))] == [2, 3, 5]
assert [int(e[i]) for i in range(len(e))] == [3, 2, 1]
assert int(pari(2**31 - 1).factor()[0][0]) == 2147483647
assert int(pari(100).nextprime(True)) == 101
assert int(pari(-37).nextprime(True)) == 2
assert int(pari(2).nextprime(True)) == 3
assert int(pari(2).Mod(101).znorder()) == 100
assert int(pari(2).Mod(101).znorder(100)) == 100
assert int(pari(4).eulerphi()) == 2
assert int(pari(360).eulerphi()) == 96
assert int(pari.prime(58)) == 271
assert pari(2**31 - 1).isprime() is True
assert pari(2**31).isprime() is False
assert pari(10**20 + 39).isprime() is True
expected_nextprime_2_512 = int(
    "134078079299425970995740249982058461274793658205923933777235614437217640"
    "300735469768018742981669034276900318581864860508537538828119465699464336"
    "49006084171"
)
assert int(pari(2**512).nextprime(True)) == expected_nextprime_2_512
assert pari(2**31 - 1).ispseudoprime() is True
assert pari(2**31).ispseudoprime() is False
power, base = pari(3**100).isprimepower()
assert power == 100
assert int(base) == 3
power, base = pari(997**100).ispseudoprimepower()
assert power == 100
assert int(base) == 997
power, base = pari(998**100).ispseudoprimepower()
assert power == 0
assert tuple(map(int, pari(9).ispower())) == (2, 3)
assert tuple(map(int, pari(17).ispower())) == (1, 17)
assert pari(17).ispower(2) == (False, None)
power, base = pari(-8).ispower()
assert power == 3
assert int(base) == -2
ff9_pol = pari(3).ffinit(2)
assert ff9_pol.type() == "t_POL"
assert str(ff9_pol) == "Mod(1, 3)*x^2 + Mod(1, 3)*x + Mod(2, 3)"
assert [int(c) for c in ff9_pol.list()] == [2, 1, 1]
assert str(ff9_pol.ffgen()) == "x"
ff9_gen = ff9_pol.ffgen()
ff9_frobenius = ff9_gen.fffrobenius()
ff9_frobenius_2 = ff9_frobenius.ffcompomap(ff9_frobenius)
assert str(ff9_frobenius.ffmap(ff9_gen)) == str(
    pari("ffmap(fffrobenius(ffgen(ffinit(3,2))),ffgen(ffinit(3,2)))")
)
assert str(ff9_frobenius_2.ffmap(ff9_gen)) == str(ff9_gen)
try:
    pari(1).fffrobenius()
except PariError as err:
    assert "PARI error" in str(err)
else:
    raise AssertionError("invalid Frobenius input did not raise PariError")
assert str(pari("29*31")) == "899"
assert str(pari(2).Mod(3)) == "Mod(2, 3)"
rebuilt = pari([pari(2).Mod(3), pari(1).Mod(3), pari(1).Mod(3)]).Polrev()
assert str(rebuilt) == str(ff9_pol)
assert rebuilt.factor().ncols() == 2
try:
    pari("1/0")
except PariError as err:
    assert "impossible inverse" in str(err)
else:
    raise AssertionError("PARI division by zero did not raise PariError")
assert str(pari("13*17")) == "221"
try:
    pari("sqrtint(-1)")
except PariError as err:
    assert "PARI error" in str(err)
else:
    raise AssertionError("PARI domain error did not raise PariError")
assert str(pari("19*23")) == "437"
for constructor in (Pari().__call__, Gen().__getattr__("factor")):
    try:
        constructor()
    except NotImplementedError:
        pass
    else:
        raise AssertionError(f"{constructor!r} did not fail closed")
PY

echo "cypari2-build-support-ok generated-pari-declarations cython-cimport-probe focused-gen-runtime libpari-side-module-error-recovery cython-pari-side-module-error-recovery"
