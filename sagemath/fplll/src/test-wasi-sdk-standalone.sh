#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 5 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR GMP_DIR MPFR_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
gmp_dir="$(cd "$4" && pwd)"
mpfr_dir="$(cd "$5" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "fplll" wasi-sdk "$bin_dir" "$probe_dir"

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
  echo "cowasm: fplll standalone smoke requires pinned wasi-sdk exception archives" >&2
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
  CPPFLAGS="-I$gmp_dir/include -I$mpfr_dir/include" \
  CXXFLAGS="-Oz -fvisibility-main" \
  LDFLAGS="-L$gmp_dir/lib -L$mpfr_dir/lib ${standalone_ldlibs[*]}" \
  LIBS="-lmpfr -lgmp" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --with-gmp="$gmp_dir" \
      --with-mpfr="$mpfr_dir" \
      --without-qd \
      --disable-shared \
      --enable-static \
      --with-max-parallel-enum-dim=0

COWASM_TOOLCHAIN=wasi-sdk make -C fplll -j"$jobs" \
  PTHREAD_CFLAGS= \
  PTHREAD_LIBS= \
  libfplll.la
COWASM_TOOLCHAIN=wasi-sdk make -C fplll \
  PTHREAD_CFLAGS= \
  PTHREAD_LIBS= \
  install-libLTLIBRARIES \
  install-data
COWASM_TOOLCHAIN=wasi-sdk make install-data

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-c++" \
  -fvisibility-main \
  "$src_dir/test-fplll.cpp" \
  -I"$dist_dir/include" \
  -I"$mpfr_dir/include" \
  -I"$gmp_dir/include" \
  -L"$dist_dir/lib" \
  -L"$mpfr_dir/lib" \
  -L"$gmp_dir/lib" \
  -lfplll \
  -lmpfr \
  -lgmp \
  -lm \
  "$libcxxabi" \
  "$libunwind" \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/fplll-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/fplll-test" |
  grep "fplll-ok first-vector=4,34,9 svp-norm=1253 cvp-vector=4,34,9 bkz-first=4,34,9"
