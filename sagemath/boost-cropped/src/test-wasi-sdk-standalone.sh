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

cowasm_standalone_probe "boost-cropped" wasi-sdk "$bin_dir" "$probe_dir"

default_libcxxabi="$("$bin_dir/wasi-sdk-clang++-next" -target wasm32-wasip1 -print-file-name=libc++abi.a)"
libcxxabi="${default_libcxxabi%/noeh/libc++abi.a}/eh/libc++abi.a"
libunwind="${default_libcxxabi%/noeh/libc++abi.a}/eh/libunwind.a"
if [ ! -f "$libcxxabi" ] || [ ! -f "$libunwind" ]; then
  echo "cowasm: boost-cropped standalone smoke requires pinned wasi-sdk exception archives" >&2
  echo "  $libcxxabi" >&2
  echo "  $libunwind" >&2
  exit 77
fi

rm -rf "$dist_dir"
mkdir -p "$dist_dir/include"
cp -a "$build_dir/boost" "$dist_dir/include/"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-c++" \
  -std=c++14 \
  -fvisibility-main \
  "$src_dir/test-boost-cropped.cpp" \
  -I"$dist_dir/include" \
  "$libcxxabi" \
  "$libunwind" \
  -o "$probe_dir/boost-cropped-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/boost-cropped-test" |
  grep -F "boost-cropped-ok version=1_66 bits=2 refs=1 token=cowasm"
