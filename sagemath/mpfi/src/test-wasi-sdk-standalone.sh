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

cowasm_standalone_probe "mpfi" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

standalone_ldlibs=(-lwasi-emulated-signal)
rm -rf "$dist_dir"

cd "$build_dir"
env \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CC="$bin_dir/cowasm-cc" \
  CC_FOR_BUILD="zig cc ${ZIG_NATIVE_CFLAGS:-}" \
  CPPFLAGS="-I$gmp_dir/include -I$mpfr_dir/include" \
  CFLAGS="-Oz -fvisibility-main" \
  LDFLAGS="-L$gmp_dir/lib -L$mpfr_dir/lib ${standalone_ldlibs[*]}" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --with-gmp="$gmp_dir" \
      --with-mpfr="$mpfr_dir" \
      --disable-shared \
      --enable-static

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make install

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  "$src_dir/test-mpfi.c" \
  -I"$dist_dir/include" \
  -I"$mpfr_dir/include" \
  -I"$gmp_dir/include" \
  -L"$dist_dir/lib" \
  -L"$mpfr_dir/lib" \
  -L"$gmp_dir/lib" \
  -lmpfi \
  -lmpfr \
  -lgmp \
  -lm \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/mpfi-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/mpfi-test" |
  grep -F "mpfi-ok interval-arithmetic sum=[3,8] product=[2,15] intersection=[2,3] hull=[1,5] bisect=[1,3]|[3,5] transcendentals=pi,sin,cos,log,exp"
