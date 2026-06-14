#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: test-clang-standalone.sh BUILD_DIR DIST_DIR BIN_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
jobs="${JOBS:-8}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_clang_standalone_probe "zlib" "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

cd "$build_dir"
CHOST=none \
AR="$bin_dir/cowasm-ar" \
RANLIB="$bin_dir/cowasm-ranlib" \
CC="$bin_dir/cowasm-cc" \
CFLAGS="-Oz -fvisibility-main" \
COWASM_TOOLCHAIN=clang \
  ./configure --static --prefix="$dist_dir"

COWASM_TOOLCHAIN=clang make -j"$jobs" install

# Keep parity with the default zlib wasm build, which rebuilds the archive from
# object files because upstream's generated archive is malformed for wasm tools.
rm -f libz.a
COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-ar" rc libz.a *.o
cp libz.a "$dist_dir/lib"

COWASM_TOOLCHAIN=clang make example
"$bin_dir/cowasm" ./example
