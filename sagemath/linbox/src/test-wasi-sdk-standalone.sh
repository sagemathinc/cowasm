#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 9 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR GMP_DIR GIVARO_DIR GSL_DIR FFLAS_FFPACK_DIR MPFR_DIR FPLLL_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
gmp_dir="$(cd "$4" && pwd)"
givaro_dir="$(cd "$5" && pwd)"
gsl_dir="$(cd "$6" && pwd)"
fflas_ffpack_dir="$(cd "$7" && pwd)"
mpfr_dir="$(cd "$8" && pwd)"
fplll_dir="$(cd "$9" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "linbox" wasi-sdk "$bin_dir" "$probe_dir"

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
  echo "cowasm: linbox standalone smoke requires pinned wasi-sdk exception archives" >&2
  echo "  $libcxxabi" >&2
  echo "  $libunwind" >&2
  exit 77
fi

rm -rf "$dist_dir"

fflas_cflags="-I$fflas_ffpack_dir/include -I$givaro_dir/include -I$gmp_dir/include -I$gsl_dir/include"
fflas_libs="-L$givaro_dir/lib -L$gmp_dir/lib -L$gsl_dir/lib -lgivaro -lgmpxx -lgmp -lgslcblas -lm"
mpfr_cflags="-I$mpfr_dir/include"
fplll_cflags="-I$fplll_dir/include"

cd "$build_dir"
env \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  NM="$bin_dir/wasi-sdk-llvm-nm-next" \
  CC="$bin_dir/cowasm-cc" \
  CXX="$bin_dir/cowasm-c++" \
  CPPFLAGS="$fflas_cflags $mpfr_cflags $fplll_cflags" \
  CXXFLAGS="-std=c++14 -Oz -fvisibility-main" \
  LDFLAGS="-L$mpfr_dir/lib -L$fplll_dir/lib ${standalone_ldlibs[*]}" \
  FFLAS_FFPACK_CFLAGS="$fflas_cflags" \
  FFLAS_FFPACK_LIBS="$fflas_libs" \
  CCNAM=clang \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --without-archnative \
      --without-ntl \
      --with-mpfr="$mpfr_dir" \
      --without-iml \
      --without-flint \
      --with-fplll="$fplll_dir" \
      --without-ocl \
      --without-mpi \
      --disable-shared \
      --enable-static \
      --disable-doc

COWASM_TOOLCHAIN=wasi-sdk make -C linbox -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make -C linbox install
COWASM_TOOLCHAIN=wasi-sdk make install-pkgconfigDATA install-binSCRIPTS

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-c++" \
  -std=c++14 \
  -fvisibility-main \
  "$src_dir/test-linbox.cpp" \
  -I"$dist_dir/include" \
  -I"$fflas_ffpack_dir/include" \
  -I"$givaro_dir/include" \
  -I"$gmp_dir/include" \
  -I"$gsl_dir/include" \
  -I"$mpfr_dir/include" \
  -I"$fplll_dir/include" \
  -L"$dist_dir/lib" \
  -L"$fplll_dir/lib" \
  -L"$mpfr_dir/lib" \
  -L"$givaro_dir/lib" \
  -L"$gmp_dir/lib" \
  -L"$gsl_dir/lib" \
  -llinbox \
  -lfplll \
  -lmpfr \
  -lgivaro \
  -lgmpxx \
  -lgmp \
  -lgslcblas \
  -lm \
  "$libcxxabi" \
  "$libunwind" \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/linbox-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/linbox-test" |
  grep -F "linbox-ok product=2,5,9,16 mod17"
