#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 5 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR M4RI_DIR BOOST_CROPPED_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
m4ri_dir="$(cd "$4" && pwd)"
boost_cropped_dir="$(cd "$5" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "brial" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

standalone_ldlibs=(-lwasi-emulated-signal -lwasi-emulated-process-clocks)
default_libcxxabi="$("$bin_dir/wasi-sdk-clang++-next" -target wasm32-wasip1 -print-file-name=libc++abi.a)"
libcxxabi="${default_libcxxabi%/noeh/libc++abi.a}/eh/libc++abi.a"
libunwind="${default_libcxxabi%/noeh/libc++abi.a}/eh/libunwind.a"
if [ ! -f "$libcxxabi" ] || [ ! -f "$libunwind" ]; then
  echo "cowasm: brial standalone smoke requires pinned wasi-sdk exception archives" >&2
  echo "  $libcxxabi" >&2
  echo "  $libunwind" >&2
  exit 77
fi

rm -rf "$dist_dir"

cd "$build_dir"
env \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CC="$bin_dir/cowasm-cc" \
  CXX="$bin_dir/cowasm-c++" \
  CPPFLAGS="-I$boost_cropped_dir/include -I$m4ri_dir/include" \
  CFLAGS="-Oz -fvisibility-main" \
  CXXFLAGS="-Oz -std=c++14 -fvisibility-main -DLINE_MAX=2048" \
  LDFLAGS="-L$m4ri_dir/lib ${standalone_ldlibs[*]}" \
  M4RI_CFLAGS="-I$m4ri_dir/include" \
  M4RI_LIBS="-L$m4ri_dir/lib -lm4ri" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --with-boost-unit-test-framework=no \
      --disable-shared \
      --enable-static

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make install

test -f "$dist_dir/include/polybori.h"
test -f "$dist_dir/lib/libbrial.a"
test -f "$dist_dir/lib/libbrial_groebner.a"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-c++" \
  -std=c++14 \
  -fvisibility-main \
  "$src_dir/test-brial.cpp" \
  -I"$dist_dir/include" \
  -I"$boost_cropped_dir/include" \
  -I"$m4ri_dir/include" \
  -L"$dist_dir/lib" \
  -L"$m4ri_dir/lib" \
  -lbrial_groebner \
  -lbrial \
  -lm4ri \
  -lm \
  "$libcxxabi" \
  "$libunwind" \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/brial-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/brial-test" |
  grep -F "brial-ok product=" |
  grep -F "reduced=y*z groebner-basis=2 nf(x)=1 terms=4"
