#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: test-clang-standalone.sh BUILD_DIR DIST_DIR BIN_DIR SRC_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
src_dir="$(cd "$4" && pwd)"
jobs="${JOBS:-8}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_clang_standalone_probe "lua" "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir/bin" "$dist_dir/include" "$dist_dir/lib"

cd "$build_dir"
COWASM_TOOLCHAIN=clang make clean
COWASM_TOOLCHAIN=clang make -j"$jobs" \
  CC="$bin_dir/cowasm-cc" \
  AR="$bin_dir/cowasm-ar rc" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CFLAGS="-Wall -Oz -fvisibility-main -std=c99 -DL_tmpnam=32" \
  MYCFLAGS= \
  MYLDFLAGS= \
  MYLIBS=

cp lua "$dist_dir/bin/lua"
cp liblua.a "$dist_dir/lib/liblua.a"
cp lua.h luaconf.h lualib.h lauxlib.h "$dist_dir/include/"

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/lua" "$src_dir/sum.lua" |
  grep 50000005000000
