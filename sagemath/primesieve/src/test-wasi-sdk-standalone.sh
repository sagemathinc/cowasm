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

cowasm_standalone_probe "primesieve" wasi-sdk "$bin_dir" "$probe_dir"

if ! command -v cmake >/dev/null 2>&1; then
  echo "cowasm: primesieve standalone smoke requires cmake" >&2
  exit 77
fi

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

default_libcxxabi="$("$bin_dir/wasi-sdk-clang++-next" -target wasm32-wasip1 -print-file-name=libc++abi.a)"
libcxxabi="${default_libcxxabi%/noeh/libc++abi.a}/eh/libc++abi.a"
libunwind="${default_libcxxabi%/noeh/libc++abi.a}/eh/libunwind.a"
if [ ! -f "$libcxxabi" ] || [ ! -f "$libunwind" ]; then
  echo "cowasm: primesieve standalone smoke requires pinned wasi-sdk exception archives" >&2
  echo "  $libcxxabi" >&2
  echo "  $libunwind" >&2
  exit 77
fi

cmake_build="$build_dir/cowasm-wasi-sdk-build"
rm -rf "$dist_dir" "$cmake_build"
mkdir -p "$cmake_build"

cd "$cmake_build"
COWASM_TOOLCHAIN=wasi-sdk cmake "$build_dir" \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_SYSTEM_NAME=Generic \
  -DCMAKE_TRY_COMPILE_TARGET_TYPE=STATIC_LIBRARY \
  -DCMAKE_C_COMPILER="$bin_dir/cowasm-cc" \
  -DCMAKE_CXX_COMPILER="$bin_dir/cowasm-c++" \
  -DCMAKE_AR="$bin_dir/cowasm-ar" \
  -DCMAKE_RANLIB="$bin_dir/cowasm-ranlib" \
  -DCMAKE_INSTALL_PREFIX="$dist_dir" \
  -DCMAKE_POSITION_INDEPENDENT_CODE=ON \
  -DBUILD_PRIMESIEVE=OFF \
  -DBUILD_SHARED_LIBS=OFF \
  -DBUILD_STATIC_LIBS=ON \
  -DBUILD_TESTS=OFF \
  -DBUILD_EXAMPLES=OFF

COWASM_TOOLCHAIN=wasi-sdk cmake --build . --parallel "$jobs"
COWASM_TOOLCHAIN=wasi-sdk cmake --install .

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -c \
  "$src_dir/test-primesieve.c" \
  -I"$dist_dir/include" \
  -o "$probe_dir/test-primesieve.o"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-c++" \
  -fvisibility-main \
  "$probe_dir/test-primesieve.o" \
  -I"$dist_dir/include" \
  -L"$dist_dir/lib" \
  -lprimesieve \
  "$libcxxabi" \
  "$libunwind" \
  -o "$probe_dir/primesieve-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/primesieve-test" |
  grep "primesieve-ok pi(1e6)=78498 nth1000=7919 twins100=8 window-count=6 generated=3 next4=31,37,41,43 iterator=101,103,97"
