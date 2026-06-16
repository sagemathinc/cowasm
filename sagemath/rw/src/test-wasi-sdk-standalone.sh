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

cowasm_standalone_probe "rw" wasi-sdk "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir/include" "$dist_dir/lib"

cd "$build_dir"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -std=c99 \
  -pedantic \
  -Oz \
  -DNDEBUG \
  -c rw.c \
  -o rw.o

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-ar" rc librw.a rw.o
env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-ranlib" librw.a

cp librw.a "$dist_dir/lib/"
cp rw.h "$dist_dir/include/"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -Oz \
  -I"$dist_dir/include" \
  -c "$src_dir/test-rw.c" \
  -o "$probe_dir/test-rw.o"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -fvisibility-main \
  "$probe_dir/test-rw.o" \
  "$dist_dir/lib/librw.a" \
  -o "$probe_dir/rw-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/rw-test" |
  grep "rw-ok path4-width=1"
