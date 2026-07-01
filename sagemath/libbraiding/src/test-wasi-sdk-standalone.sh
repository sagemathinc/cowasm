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

cowasm_standalone_probe "libbraiding" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

default_libcxxabi="$("$bin_dir/wasi-sdk-clang++-next" -target wasm32-wasip1 -print-file-name=libc++abi.a)"
libcxxabi="${default_libcxxabi%/noeh/libc++abi.a}/eh/libc++abi.a"
libunwind="${default_libcxxabi%/noeh/libc++abi.a}/eh/libunwind.a"
if [ ! -f "$libcxxabi" ] || [ ! -f "$libunwind" ]; then
  echo "cowasm: libbraiding standalone smoke requires pinned wasi-sdk exception archives" >&2
  echo "  $libcxxabi" >&2
  echo "  $libunwind" >&2
  exit 77
fi

rm -rf "$dist_dir"

cd "$build_dir"
autoreconf -fi
env \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CC="$bin_dir/cowasm-cc" \
  CXX="$bin_dir/cowasm-c++" \
  CFLAGS="-Oz -fPIC -fvisibility-main" \
  CXXFLAGS="-Oz -fPIC -fvisibility-main" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --disable-shared \
      --enable-static

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make install

test -f "$dist_dir/include/braiding.h"
test -f "$dist_dir/lib/libbraiding.a"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-c++" \
  -fvisibility-main \
  "$src_dir/test-libbraiding.cpp" \
  -I"$dist_dir/include" \
  -L"$dist_dir/lib" \
  -lbraiding \
  "$libcxxabi" \
  "$libunwind" \
  -o "$probe_dir/libbraiding-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/libbraiding-test" |
  grep -F "libbraiding-ok index=3 canonical-length=1 supremum=1 conjugator-length=2"
