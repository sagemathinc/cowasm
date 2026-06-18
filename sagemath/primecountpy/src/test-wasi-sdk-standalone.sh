#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 10 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR CPYTHON_WASM PY_CYTHON POSIX_WASI_SDK LIBCXX_WASI_SDK CYSIGNALS_WASI_SDK PRIMECOUNT_WASI_SDK PRIMESIEVE_WASI_SDK" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
cpython_wasm="$(cd "$4" && pwd)"
py_cython="$(cd "$5" && pwd)"
posix_wasi_sdk="$(cd "$6" && pwd)"
libcxx_dir="$(cd "$7" && pwd)"
cysignals_dir="$(cd "$8" && pwd)"
primecount_dir="$(cd "$9" && pwd)"
primesieve_dir="$(cd "${10}" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "primecountpy" wasi-sdk "$bin_dir" "$probe_dir"

python_include="$cpython_wasm/include/python3.14"
extension_suffix=".cpython-314-wasm32-wasi.so"
package_src="$build_dir/primecountpy"
patched_src="$probe_dir/primecountpy-src"

rm -rf "$dist_dir"
mkdir -p "$dist_dir/primecountpy"
mkdir -p "$patched_src"

cat >"$probe_dir/wasi-cxx-thread-stubs.h" <<'EOF'
#ifdef __cplusplus
extern "C" {
#endif
int sched_yield(void);
void __wasm_call_ctors(void);
#ifdef __cplusplus
}
#endif
EOF

cat >"$patched_src/defs.pxd" <<'EOF'
from libc.stddef cimport size_t
from libc.stdint cimport int64_t

cdef extern from "primecount.h":
    int64_t primecount_pi(int64_t x)
    int primecount_pi_str(const char* x, char* res, size_t len)
    int64_t primecount_nth_prime(int64_t n)
    int64_t primecount_phi(int64_t x, int64_t a)
EOF

cat >"$patched_src/primecount.pyx" <<'EOF'
from cpython.long cimport PyLong_FromString
from libc.stdint cimport int64_t
from libc.string cimport memset

from cysignals.signals cimport sig_on, sig_off
cimport defs as pcount

cdef extern from *:
    void __wasm_call_ctors()

cdef bint _primecount_ctors_done = False

cdef inline int _do_sig(int64_t n):
    return n >> 26

cdef inline void _ensure_primecount_ctors():
    global _primecount_ctors_done
    if not _primecount_ctors_done:
        __wasm_call_ctors()
        _primecount_ctors_done = True

cpdef int64_t prime_pi(int64_t n, method=None) except -1:
    cdef int64_t ans
    _ensure_primecount_ctors()
    if _do_sig(n): sig_on()
    ans = pcount.primecount_pi(n)
    if _do_sig(n): sig_off()
    return ans

cpdef prime_pi_128(n):
    cdef bytes s = str(n).encode('ascii')
    cdef char ans[64]
    cdef int ans_len

    _ensure_primecount_ctors()
    memset(ans, 0, sizeof(ans))
    sig_on()
    ans_len = pcount.primecount_pi_str(s, ans, sizeof(ans))
    sig_off()
    if ans_len < 0:
        raise ValueError("primecount_pi_str failed")
    return PyLong_FromString(ans, NULL, 10)

cpdef int64_t nth_prime(int64_t n) except -1:
    if n <= 0:
        raise ValueError("n must be positive")

    cdef int64_t ans
    _ensure_primecount_ctors()
    if _do_sig(n): sig_on()
    ans = pcount.primecount_nth_prime(n)
    if _do_sig(n): sig_off()
    return ans

cpdef int64_t phi(int64_t x, int64_t a):
    _ensure_primecount_ctors()
    return pcount.primecount_phi(x, a)
EOF

PYTHONPATH="$py_cython:$cysignals_dir" python3 -m cython -3 --cplus \
  -I "$patched_src" \
  -I "$cysignals_dir" \
  --output-file "$probe_dir/primecount.cpp" \
  "$patched_src/primecount.pyx"

"$bin_dir/wasi-sdk-clang++-next" -target wasm32-wasip1 \
  -O0 \
  -fPIC \
  -D_SCHED_H \
  -shared \
  -nostdlib \
  -Wl,--allow-undefined \
  -Wl,--no-entry \
  -Wl,--export=PyInit_primecount \
  -include "$probe_dir/wasi-cxx-thread-stubs.h" \
  -I"$python_include" \
  -I"$posix_wasi_sdk" \
  -I"$patched_src" \
  -I"$cysignals_dir" \
  -I"$cysignals_dir/cysignals" \
  -I"$primecount_dir/include" \
  -I"$primesieve_dir/include" \
  "$probe_dir/primecount.cpp" \
  "$primecount_dir/lib/libprimecount.a" \
  "$primesieve_dir/lib/libprimesieve.a" \
  "$libcxx_dir/libcxx.so" \
  -o "$dist_dir/primecountpy/primecount$extension_suffix"

"$bin_dir/wasi-sdk-llvm-objdump-next" -h "$dist_dir/primecountpy/primecount$extension_suffix" |
  grep 'dylink\.0'
"$bin_dir/wasi-sdk-llvm-nm-next" "$dist_dir/primecountpy/primecount$extension_suffix" |
  grep ' T PyInit_primecount$'

cp "$package_src/__init__.py" "$patched_src/defs.pxd" "$dist_dir/primecountpy/"
cp "$libcxx_dir/libcxx.so" "$dist_dir/primecountpy/"

cd "$probe_dir"
PYTHONPATH="$dist_dir:$cysignals_dir" "$bin_dir/python-wasm" - <<'PY'
from primecountpy.primecount import nth_prime, phi, prime_pi, prime_pi_128

assert prime_pi(1) == 0
assert prime_pi(2) == 1
assert prime_pi(1000) == 168
assert prime_pi(1000, method="deleglise_rivat") == 168
assert prime_pi_128(10**10) == 455052511
assert nth_prime(1) == 2
assert nth_prime(168) == 997
assert nth_prime(1000) == 7919
assert phi(100, 4) == 22
assert phi(1000, 5) == 207

try:
    nth_prime(0)
except ValueError as err:
    assert "positive" in str(err)
else:
    raise AssertionError("nth_prime(0) should reject non-positive input")

assert prime_pi(100) == 25
assert nth_prime(10) == 29
PY

echo "primecountpy-ok prime_pi prime_pi_128 nth_prime phi validation recovery"
