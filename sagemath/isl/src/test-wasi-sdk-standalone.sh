#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR GMP_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
gmp_dir="$(cd "$4" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "isl" wasi-sdk "$bin_dir" "$probe_dir"

standalone_ldlibs=(
  -lwasi-emulated-signal
)

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
  NM="$bin_dir/wasi-sdk-llvm-nm-next" \
  CC="$bin_dir/cowasm-cc" \
  CXX="$bin_dir/cowasm-c++" \
  CC_FOR_BUILD="zig cc ${ZIG_NATIVE_CFLAGS:-}" \
  CFLAGS="-Oz -I$gmp_dir/include" \
  CXXFLAGS="-Oz -I$gmp_dir/include" \
  LDFLAGS="-L$gmp_dir/lib" \
  LIBS="${standalone_ldlibs[*]}" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --with-int=gmp \
      --with-gmp=system \
      --with-gmp-prefix="$gmp_dir" \
      --disable-shared \
      --enable-static

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make install

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  "$src_dir/test-isl.c" \
  -I"$dist_dir/include" \
  -I"$gmp_dir/include" \
  -L"$dist_dir/lib" \
  -L"$gmp_dir/lib" \
  -lisl \
  -lgmp \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/isl-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/isl-test" |
  grep -F "isl-ok box=12 image=6 affine=exact"
