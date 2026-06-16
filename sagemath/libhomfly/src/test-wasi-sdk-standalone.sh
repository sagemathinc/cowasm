#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR GC_WASI_SDK" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
gc_dir="$(cd "$4" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "libhomfly" wasi-sdk "$bin_dir" "$probe_dir"

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
  CPPFLAGS="-I$gc_dir/include" \
  CFLAGS="-Oz -fvisibility-main" \
  LDFLAGS="-L$gc_dir/lib" \
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

test -f "$dist_dir/include/homfly.h"
test -f "$dist_dir/lib/libhomfly.a"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -Oz \
  "$src_dir/test-libhomfly.c" \
  -I"$dist_dir/include" \
  -I"$gc_dir/include" \
  -L"$dist_dir/lib" \
  -L"$gc_dir/lib" \
  -lhomfly \
  -lgc \
  -lwasi-emulated-process-clocks \
  -o "$probe_dir/libhomfly-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/libhomfly-test" |
  grep -F "libhomfly-ok terms=3 polynomial= - L^-4 - 2L^-2 + M^2L^-2"
