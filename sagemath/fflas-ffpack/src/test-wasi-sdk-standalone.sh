#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 6 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR GMP_DIR GIVARO_DIR GSL_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
gmp_dir="$(cd "$4" && pwd)"
givaro_dir="$(cd "$5" && pwd)"
gsl_dir="$(cd "$6" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "fflas-ffpack" wasi-sdk "$bin_dir" "$probe_dir"

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
  echo "cowasm: fflas-ffpack standalone smoke requires pinned wasi-sdk exception archives" >&2
  echo "  $libcxxabi" >&2
  echo "  $libunwind" >&2
  exit 77
fi

rm -rf "$dist_dir"

cd "$build_dir"
env \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  NM="$bin_dir/wasi-sdk-llvm-nm-next" \
  CC="$bin_dir/cowasm-cc" \
  CXX="$bin_dir/cowasm-c++" \
  CPPFLAGS="-I$givaro_dir/include -I$gmp_dir/include -I$gsl_dir/include" \
  CXXFLAGS="-Oz -fvisibility-main" \
  LDFLAGS="-L$givaro_dir/lib -L$gmp_dir/lib -L$gsl_dir/lib ${standalone_ldlibs[*]}" \
  LIBS="-lgivaro -lgmpxx -lgmp -lgslcblas" \
  GIVARO_CFLAGS="-I$givaro_dir/include -I$gmp_dir/include" \
  GIVARO_LIBS="-L$givaro_dir/lib -L$gmp_dir/lib -lgivaro -lgmpxx -lgmp" \
  BLAS_CFLAGS="-I$gsl_dir/include" \
  BLAS_LIBS="-L$gsl_dir/lib -lgslcblas" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --without-archnative \
      --disable-shared \
      --enable-static \
      --disable-openmp \
      --disable-precompilation

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make install

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-c++" \
  -fvisibility-main \
  "$src_dir/test-fflas-ffpack.cpp" \
  -I"$dist_dir/include" \
  -I"$givaro_dir/include" \
  -I"$gmp_dir/include" \
  -I"$gsl_dir/include" \
  -L"$givaro_dir/lib" \
  -L"$gmp_dir/lib" \
  -L"$gsl_dir/lib" \
  -lgivaro \
  -lgmpxx \
  -lgmp \
  -lgslcblas \
  -lm \
  "$libcxxabi" \
  "$libunwind" \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/fflas-ffpack-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/fflas-ffpack-test" |
  grep "fflas-ffpack-ok product=2,5,9,16 rank=1 det=15 solve=13,11,13,15"
