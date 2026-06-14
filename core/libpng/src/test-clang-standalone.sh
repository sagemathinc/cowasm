#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: test-clang-standalone.sh BUILD_DIR DIST_DIR BIN_DIR ZLIB_DIST_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
zlib_dist_dir="$4"
jobs="${JOBS:-8}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_clang_standalone_probe "libpng" "$bin_dir" "$probe_dir"

zlib_dist_dir="$(cd "$zlib_dist_dir" && pwd)"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

cd "$build_dir"
CC="$bin_dir/cowasm-cc" \
AR="$bin_dir/cowasm-ar" \
RANLIB="$bin_dir/cowasm-ranlib" \
CFLAGS="-Oz -fvisibility-main -I$zlib_dist_dir/include -L$zlib_dist_dir/lib -D__COVERITY__" \
COWASM_TOOLCHAIN=clang \
  ./configure \
    --prefix="$dist_dir" \
    --host=none \
    --disable-shared \
    --enable-static

COWASM_TOOLCHAIN=clang make -j"$jobs" libpng16.la timepng

mkdir -p "$dist_dir/lib" "$dist_dir/include"
cp .libs/libpng16.a "$dist_dir/lib/libpng.a"
cp png.h pngconf.h pnglibconf.h "$dist_dir/include/"

cowasm_clang_standalone_run_wasi "$bin_dir" ./timepng pngnow.png
