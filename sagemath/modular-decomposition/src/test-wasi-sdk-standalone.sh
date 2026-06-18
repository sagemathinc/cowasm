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

cowasm_standalone_probe "modular-decomposition" wasi-sdk "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir/include" "$dist_dir/lib"

cd "$build_dir"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -std=c99 \
  -Oz \
  -DNDEBUG \
  -Wno-comment \
  -c dm.c \
  -o dm.o

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-ar" rc libmodular_decomposition.a dm.o
env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-ranlib" libmodular_decomposition.a

cp libmodular_decomposition.a "$dist_dir/lib/"
cp dm_english.h "$dist_dir/include/modular_decomposition.h"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -std=c99 \
  -Oz \
  -Wno-comment \
  -I"$dist_dir/include" \
  -c "$src_dir/test-modular-decomposition.c" \
  -o "$probe_dir/test-modular-decomposition.o"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -fvisibility-main \
  "$probe_dir/test-modular-decomposition.o" \
  "$dist_dir/lib/libmodular_decomposition.a" \
  -o "$probe_dir/modular-decomposition-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/modular-decomposition-test" |
  grep "modular-decomposition-ok empty=parallel complete=series path=prime"
