#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 5 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR GMP_DIR GSL_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
gmp_dir="$(cd "$4" && pwd)"
gsl_dir="$(cd "$5" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "iml" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

standalone_ldlibs=(-lwasi-emulated-signal)
rm -rf "$dist_dir"

cd "$build_dir"
env \
  ac_cv_func_realloc_0_nonnull=yes \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CC="$bin_dir/cowasm-cc" \
  CPPFLAGS="-I$gmp_dir/include -I$gsl_dir/include" \
  CFLAGS="-Oz -fvisibility-main" \
  LDFLAGS="-L$gmp_dir/lib -L$gsl_dir/lib ${standalone_ldlibs[*]}" \
  LIBS="-lgmp -lgslcblas -lm" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --with-gmp-include="$gmp_dir/include" \
      --with-gmp-lib="$gmp_dir/lib" \
      --with-cblas="-lgslcblas" \
      --with-cblas-include="$gsl_dir/include" \
      --with-cblas-lib="$gsl_dir/lib" \
      --disable-shared \
      --enable-static

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make install

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -fvisibility-main \
  "$src_dir/test-iml.c" \
  -I"$dist_dir/include" \
  -I"$gmp_dir/include" \
  -I"$gsl_dir/include" \
  -L"$dist_dir/lib" \
  -L"$gmp_dir/lib" \
  -L"$gsl_dir/lib" \
  -liml \
  -lgmp \
  -lgslcblas \
  -lm \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/iml-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/iml-test" |
  grep "iml-ok det=99 rank=1 solution=(1/5,3/5)"
