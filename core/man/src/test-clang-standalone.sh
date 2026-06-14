#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 6 ]; then
  echo "usage: test-clang-standalone.sh BUILD_DIR DIST_DIR BIN_DIR POSIX_WASM_DIR ZLIB_DIST_DIR SRC_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
posix_wasm_dir="$(cd "$4" && pwd)"
zlib_dist_dir="$(cd "$5" && pwd)"
src_dir="$(cd "$6" && pwd)"
jobs="${JOBS:-8}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_clang_standalone_probe "man" "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir/bin"

cd "$build_dir"
cp "$src_dir/config.h" "$src_dir/Makefile.local" .

COWASM_TOOLCHAIN=clang make -j"$jobs" \
  AR="$bin_dir/cowasm-ar" \
  CC="$bin_dir/cowasm-cc" \
  CFLAGS="-fvisibility-main -I$posix_wasm_dir -I$zlib_dist_dir/include -Oz" \
  LDADD="-L$zlib_dist_dir/lib -lz" \
  PREFIX="$dist_dir" \
  man

cp mandoc "$dist_dir/bin/man"

"$bin_dir/cowasm" "$dist_dir/bin/man" man.1 | grep "display manual pages"
