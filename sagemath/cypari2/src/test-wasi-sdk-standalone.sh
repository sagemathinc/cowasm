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
"""Focused CoWasm runtime subset for cypari2.gen.

This is not the full upstream cypari2 object model. It implements the first
PARI-backed ``Gen`` surface needed by Sagelite's integer factorization path:
integer conversion, display, factorization, and factor-matrix access.
Unsupported paths still fail explicitly.
"""

from .types cimport (
    GEN,
    set_gel,
    t_COL,
    t_INT,
    t_MAT,
    t_POL,
    t_POLMOD,
    t_REAL,
    t_VEC,
    typ,
)
from .paridecl cimport GENtostr, cgetg, gel, glength, gclone, gunclone_deep, itos, pari_free


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
        *result = gclone(gtopolyrev(input, -1));
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
    int cowasm_cypari2_gen_clone_lifted_polcoeffs(GEN input,
                                                  GEN *result,
                                                  long *errnum)
    int cowasm_cypari2_gen_clone_mod(GEN input,
                                     GEN modulus,
                                     GEN *result,
                                     long *errnum)
    int cowasm_cypari2_gen_clone_polrev(GEN input,
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

    def __len__(self):
        cdef long kind
        if self.g == NULL:
            return 0
        kind = typ(self.g)
        if kind == t_MAT or kind == t_VEC or kind == t_COL:
            return glength(self.g)
        raise TypeError("PARI object does not have a Python length")

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

        if self.g == NULL:
            raise IndexError("empty PARI object")

        kind = typ(self.g)
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

    def type(self):
        if self.g == NULL:
            raise TypeError("empty PARI object has no type")
        return cowasm_cypari2_gen_type_name(self.g).decode("ascii")

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

    def Polrev(self, _variable=None):
        cdef GEN result = NULL
        cdef long errnum = 0

        if not cowasm_cypari2_gen_clone_polrev(self.g, &result, &errnum):
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
    cdef str text
    cdef list converted

    if isinstance(s, Gen):
        return <Gen>s

    if isinstance(s, (list, tuple)):
        converted = [objtogen(x) for x in s]
        return list_of_Gens_to_Gen(converted)

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
    get_debug_level,
    objtogen,
    prime as _prime,
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
assert isinstance(Gen(1), Gen_base)
assert int(Gen(360)) == 360
assert int(Gen(-8)) == -8
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
