#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 8 ]; then
  echo "usage: test-clang-standalone.sh BUILD_DIR DIST_DIR BIN_DIR POSIX_WASM_DIR ZLIB_DIST_DIR BZIP2_DIST_DIR LZMA_DIST_DIR SRC_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
posix_wasm_dir="$4"
zlib_dist_dir="$5"
bzip2_dist_dir="$6"
lzma_dist_dir="$7"
src_dir="$(cd "$8" && pwd)"
jobs="${JOBS:-8}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_clang_standalone_probe "tar" "$bin_dir" "$probe_dir"

posix_wasm_dir="$(cd "$posix_wasm_dir" && pwd)"
zlib_dist_dir="$(cd "$zlib_dist_dir" && pwd)"
bzip2_dist_dir="$(cd "$bzip2_dist_dir" && pwd)"
lzma_dist_dir="$(cd "$lzma_dist_dir" && pwd)"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

cd "$build_dir"
CC="$bin_dir/cowasm-cc" \
AR="$bin_dir/cowasm-ar" \
RANLIB="$bin_dir/cowasm-ranlib" \
CFLAGS="-Oz -I$posix_wasm_dir -I$zlib_dist_dir/include -I$bzip2_dist_dir/include -I$lzma_dist_dir/include" \
LDFLAGS="-L$zlib_dist_dir/lib -lz -L$bzip2_dist_dir/lib -lbz2 -L$lzma_dist_dir/lib -llzma" \
COWASM_TOOLCHAIN=clang \
  ./configure \
    --host=none \
    --program-transform-name='s/bsd//' \
    --prefix="$dist_dir" \
    --without-openssl \
    --without-xml2 \
    --without-expat \
    --without-libb2 \
    --without-iconv \
    --without-libiconv-prefix \
    --without-zstd \
    --without-cng \
    --without-lz4

cat "$src_dir/config.h" >>config.h
COWASM_TOOLCHAIN=clang make -j"$jobs"
COWASM_TOOLCHAIN=clang make install

"$bin_dir/cowasm" "$dist_dir/bin/tar" -h | grep "bsdtar 3.6.1"
"$bin_dir/cowasm" "$dist_dir/bin/cat" --version | grep "bsdcat 3.6.1"
"$bin_dir/cowasm" "$dist_dir/bin/cpio" --version | grep "bsdcpio 3.6.1"

test_dir="$probe_dir/tar-roundtrip"
mkdir -p "$test_dir/input"
printf 'coWasm clang tar smoke\n' >"$test_dir/input/message.txt"
"$bin_dir/cowasm" "$dist_dir/bin/tar" -cf "$test_dir/archive.tar" -C "$test_dir" input
mkdir "$test_dir/output"
"$bin_dir/cowasm" "$dist_dir/bin/tar" -xf "$test_dir/archive.tar" -C "$test_dir/output"
cmp "$test_dir/input/message.txt" "$test_dir/output/input/message.txt"
