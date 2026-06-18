#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "meataxe" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

rm -rf "$dist_dir"

cd "$build_dir"
env \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CC="$bin_dir/cowasm-cc" \
  CFLAGS="-Oz -fvisibility-main -DOS_NO_ITIMER -DOS_NO_CPU_TIME -D_WASI_EMULATED_GETPID" \
  LDFLAGS="-lwasi-emulated-getpid" \
  ac_cv_func_malloc_0_nonnull=yes \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --disable-shared \
      --enable-static \
      --disable-dependency-tracking

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make install

test -f "$dist_dir/include/meataxe.h"
test -f "$dist_dir/lib/libmtx.a"
test -x "$dist_dir/bin/zmu"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -Oz \
  "$src_dir/test-meataxe.c" \
  -I"$dist_dir/include" \
  -L"$dist_dir/lib" \
  -lmtx \
  -lwasi-emulated-getpid \
  -o "$probe_dir/meataxe-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/meataxe-test" |
  grep "meataxe-ok product=1212 trace=0 nullity=1"

left_matrix="$probe_dir/left.mtx"
right_matrix="$probe_dir/right.mtx"
product_matrix="$probe_dir/product.mtx"
product_text="$probe_dir/product.txt"

cowasm_clang_standalone_run_wasi \
  "$bin_dir" "$probe_dir/meataxe-test" "$left_matrix" "$right_matrix" |
  grep "meataxe-files-ok"

cowasm_clang_standalone_run_wasi \
  "$bin_dir" "$dist_dir/bin/zmu" "$left_matrix" "$right_matrix" "$product_matrix"
cowasm_clang_standalone_run_wasi \
  "$bin_dir" "$dist_dir/bin/zpr" "$product_matrix" >"$product_text"

grep -F "matrix field=3 rows=2 cols=2" "$product_text"
test "$(grep -cx "12" "$product_text")" -eq 2

echo "meataxe-cli-ok zmu-zpr product=1212"
