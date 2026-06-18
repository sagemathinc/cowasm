#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 11 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR CPYTHON_WASM PY_CYTHON PY_GMPY2 POSIX_WASI_SDK LIBCXX_WASI_SDK CYSIGNALS_WASI_SDK PPL_WASI_SDK GMP_WASI_SDK" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
cpython_wasm="$(cd "$4" && pwd)"
py_cython="$(cd "$5" && pwd)"
py_gmpy2="$(cd "$6" && pwd)"
posix_wasi_sdk="$(cd "$7" && pwd)"
libcxx_dir="$(cd "$8" && pwd)"
cysignals_dir="$(cd "$9" && pwd)"
ppl_dir="$(cd "${10}" && pwd)"
gmp_dir="$(cd "${11}" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "pplpy" wasi-sdk "$bin_dir" "$probe_dir"

python_include="$cpython_wasm/include/python3.14"
extension_suffix=".cpython-314-wasm32-wasi.so"
package_src="$build_dir/ppl"
modules=(
  bit_arrays
  congruence
  constraint
  generator
  linear_algebra
  mip_problem
  polyhedron
)

rm -rf "$dist_dir"
mkdir -p "$dist_dir/ppl" "$probe_dir/cpp"

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

cp "$package_src"/__init__.py "$dist_dir/ppl/"
cp "$package_src"/*.pxd "$package_src"/ppl_shim.hh "$dist_dir/ppl/"
cp "$ppl_dir/lib/libppl.so" "$dist_dir/ppl/"
cp "$libcxx_dir/libcxx.so" "$dist_dir/ppl/"

for module in "${modules[@]}"; do
  PYTHONPATH="$py_cython:$cysignals_dir:$py_gmpy2" python3 -m cython -3 --cplus \
    -I "$package_src" \
    -I "$cysignals_dir" \
    -I "$py_gmpy2" \
    --output-file "$probe_dir/cpp/$module.cpp" \
    "$package_src/$module.pyx"

  "$bin_dir/wasi-sdk-clang++-next" -target wasm32-wasip1 \
    -O0 \
    -fPIC \
    -std=c++11 \
    -D_SCHED_H \
    -shared \
    -nostdlib \
    -Wl,--allow-undefined \
    -Wl,--no-entry \
    -Wl,--export=PyInit_"$module" \
    -include "$probe_dir/wasi-cxx-thread-stubs.h" \
    -I"$python_include" \
    -I"$posix_wasi_sdk" \
    -I"$package_src" \
    -I"$cysignals_dir" \
    -I"$cysignals_dir/cysignals" \
    -I"$py_gmpy2" \
    -I"$py_gmpy2/gmpy2" \
    -I"$ppl_dir/include" \
    -I"$gmp_dir/include" \
    "$probe_dir/cpp/$module.cpp" \
    "$package_src/ppl_shim.cc" \
    "$libcxx_dir/libcxx.so" \
    "$ppl_dir/lib/libppl.so" \
    -o "$dist_dir/ppl/$module$extension_suffix"

  "$bin_dir/wasi-sdk-llvm-objdump-next" -h "$dist_dir/ppl/$module$extension_suffix" |
    grep 'dylink\.0'
  "$bin_dir/wasi-sdk-llvm-nm-next" "$dist_dir/ppl/$module$extension_suffix" |
    grep " T PyInit_${module}$"
done

cd "$probe_dir"
PYTHONPATH="$dist_dir:$cysignals_dir:$py_gmpy2" "$bin_dir/python-wasm" - <<'PY'
import ppl
from ppl import Bit_Row, Variable

row = Bit_Row()
row.set(2)
row.set(12)
assert repr(row) == "{2, 12}"

x = Variable(0)
assert repr(x) == "x0"
assert x.id() == 0
assert x.space_dimension() == 1

for name in (
    "bit_arrays",
    "congruence",
    "constraint",
    "generator",
    "linear_algebra",
    "mip_problem",
    "polyhedron",
):
    __import__(f"ppl.{name}")

assert ppl.Variable is Variable
assert ppl.Bit_Row is Bit_Row

print("pplpy-ok import modules bit-row variable")
PY
