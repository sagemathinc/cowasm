#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: test-clang-standalone.sh BUILD_DIR DIST_DIR BIN_DIR POSIX_WASM_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
posix_wasm_dir="$(cd "$4" && pwd)"
jobs="${JOBS:-8}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_clang_standalone_probe "lzma" "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

cd "$build_dir"
CHOST=none \
AR="$bin_dir/cowasm-ar" \
RANLIB="$bin_dir/cowasm-ranlib" \
CC="$bin_dir/cowasm-cc" \
CXX="$bin_dir/cowasm-c++" \
CFLAGS="-Oz -fvisibility-main -I$posix_wasm_dir" \
COWASM_TOOLCHAIN=clang \
  ./configure \
    --build="$(./build-aux/config.guess)" \
    --host=none \
    --prefix="$dist_dir" \
    --without-libiconv-prefix \
    --without-libintl-prefix \
    --disable-threads \
    --disable-assembler

echo '#include "posix-wasm.h"' >>config.h
COWASM_TOOLCHAIN=clang make -j"$jobs"
COWASM_TOOLCHAIN=clang make install

test_dir="$probe_dir/lzma-roundtrip"
mkdir -p "$test_dir"
cp Makefile "$test_dir/Makefile"
"$bin_dir/cowasm" "$dist_dir/bin/xz" -z "$test_dir/Makefile"
"$bin_dir/cowasm" "$dist_dir/bin/xz" -d "$test_dir/Makefile.xz"
cmp Makefile "$test_dir/Makefile"
