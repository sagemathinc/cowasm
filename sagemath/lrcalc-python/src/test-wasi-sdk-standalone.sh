#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 7 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR CPYTHON_WASM PY_CYTHON POSIX_WASI_SDK LRCALC_WASI_SDK" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
cpython_wasm="$(cd "$4" && pwd)"
py_cython="$(cd "$5" && pwd)"
posix_wasi_sdk="$(cd "$6" && pwd)"
lrcalc_dir="$(cd "$7" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "lrcalc-python" wasi-sdk "$bin_dir" "$probe_dir"

python_include="$cpython_wasm/include/python3.14"
extension_suffix=".cpython-314-wasm32-wasi.so"
python_src="$build_dir/python"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

PYTHONPATH="$py_cython" python3 -m cython -3 \
  -I "$python_src" \
  --output-file "$probe_dir/lrcalc.c" \
  "$python_src/lrcalc.pyx"

"$bin_dir/wasi-sdk-clang-next" -target wasm32-wasip1 \
  -O0 \
  -fPIC \
  -D_SCHED_H \
  -shared \
  -nostdlib \
  -Wl,--allow-undefined \
  -Wl,--no-entry \
  -Wl,--export=PyInit_lrcalc \
  -I"$python_include" \
  -I"$posix_wasi_sdk" \
  -I"$python_src" \
  -I"$lrcalc_dir/include" \
  "$probe_dir/lrcalc.c" \
  "$lrcalc_dir/lib/liblrcalc.a" \
  -o "$dist_dir/lrcalc$extension_suffix"

"$bin_dir/wasi-sdk-llvm-objdump-next" -h "$dist_dir/lrcalc$extension_suffix" |
  grep 'dylink\.0'
"$bin_dir/wasi-sdk-llvm-nm-next" "$dist_dir/lrcalc$extension_suffix" |
  grep ' T PyInit_lrcalc$'

cp "$python_src/liblrcalc.pxd" "$dist_dir/"

cd "$probe_dir"
PYTHONPATH="$dist_dir" "$bin_dir/python-wasm" - <<'PY'
import lrcalc

assert lrcalc.lrcoef([3, 2, 1], [2, 1], [2, 1]) == 2
assert lrcalc.lrcoef([4, 2, 0], [2, 1], [2, 1]) == 1
assert lrcalc.mult([2, 1], [2]) == {
    (3, 2): 1,
    (4, 1): 1,
    (3, 1, 1): 1,
    (2, 2, 1): 1,
}
assert lrcalc.skew([3, 2, 1], [2, 1])[(2, 1)] == 2
assert lrcalc.mult_fusion([3, 2, 1], [3, 2, 1], 3, 2) == {
    (4, 4, 4): 1,
    (5, 4, 3): 1,
}
assert lrcalc.coprod([2, 1])[((2, 1), ())] == 1
assert lrcalc.schubmult([1, 3, 2], [1, 3, 2])[(2, 3, 1)] == 1
PY

echo "lrcalc-python-ok import lrcoef mult skew fusion coprod schubmult"
