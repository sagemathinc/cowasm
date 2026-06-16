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

host_path=""
IFS=: read -ra path_entries <<<"$PATH"
for path_entry in "${path_entries[@]}"; do
  path_entry_abs="$(cd "$path_entry" 2>/dev/null && pwd || true)"
  if [ "$path_entry_abs" = "$bin_dir" ]; then
    continue
  fi
  host_path="${host_path:+$host_path:}$path_entry"
done

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "bliss" wasi-sdk "$bin_dir" "$probe_dir"

clangxx="$bin_dir/wasi-sdk-clang++-next"
wasm_ld="$bin_dir/wasi-sdk-wasm-ld-next"
default_libcxxabi="$("$clangxx" -target wasm32-wasip1 -print-file-name=libc++abi.a)"
libcxxabi="${default_libcxxabi%/noeh/libc++abi.a}/eh/libc++abi.a"
libunwind="${default_libcxxabi%/noeh/libc++abi.a}/eh/libunwind.a"
if [ ! -f "$libcxxabi" ] || [ ! -f "$libunwind" ] || [ ! -x "$wasm_ld" ]; then
  echo "cowasm: bliss standalone smoke requires pinned wasi-sdk exception archives" >&2
  echo "  $libcxxabi" >&2
  echo "  $libunwind" >&2
  echo "  $wasm_ld" >&2
  exit 77
fi

rm -rf "$dist_dir"
mkdir -p "$dist_dir/bin" "$dist_dir/include/bliss" "$dist_dir/lib"

cd "$build_dir"

sources=(
  abstractgraph.cc
  bliss_C.cc
  defs.cc
  digraph.cc
  graph.cc
  orbit.cc
  partition.cc
  uintseqhash.cc
  utils.cc
)

objects=()
for source in "${sources[@]}"; do
  object="${source%.cc}.o"
  env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-c++" \
    -std=c++11 \
    -Oz \
    -DNDEBUG \
    -I"$build_dir/src" \
    -c "src/$source" \
    -o "$object"
  objects+=("$object")
done

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-ar" rc libbliss.a "${objects[@]}"
env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-ranlib" libbliss.a

cp libbliss.a "$dist_dir/lib/"
cp src/*.hh src/bliss_C.h "$dist_dir/include/bliss/"

env PATH="$host_path" COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-c++" \
  -std=c++11 \
  -Oz \
  -DNDEBUG \
  -fvisibility-main \
  -fuse-ld="$wasm_ld" \
  -I"$dist_dir/include/bliss" \
  src/bliss.cc \
  "$dist_dir/lib/libbliss.a" \
  "$libcxxabi" \
  "$libunwind" \
  -o "$dist_dir/bin/bliss"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -Oz \
  -I"$dist_dir/include" \
  -c "$src_dir/test-bliss.c" \
  -o "$probe_dir/test-bliss.o"

env PATH="$host_path" COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-c++" \
  -fvisibility-main \
  -fuse-ld="$wasm_ld" \
  "$probe_dir/test-bliss.o" \
  "$dist_dir/lib/libbliss.a" \
  "$libcxxabi" \
  "$libunwind" \
  -lm \
  -o "$probe_dir/bliss-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/bliss-test" |
  grep "bliss-ok c4-group=8"

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/bliss" -version |
  grep "0.77"
