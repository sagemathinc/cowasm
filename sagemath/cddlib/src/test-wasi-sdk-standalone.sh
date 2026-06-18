#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR GMP_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
gmp_dir="$(cd "$4" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "cddlib" wasi-sdk "$bin_dir" "$probe_dir"

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
  CPPFLAGS="-I$gmp_dir/include" \
  CFLAGS="-Oz -fvisibility-main" \
  LDFLAGS="-L$gmp_dir/lib ${standalone_ldlibs[*]}" \
  LIBS="-lgmp" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --disable-shared \
      --enable-static

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make install

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -DGMPRATIONAL \
  "$src_dir/test-cddlib.c" \
  -I"$dist_dir/include" \
  -I"$gmp_dir/include" \
  -L"$dist_dir/lib" \
  -L"$gmp_dir/lib" \
  -lcddgmp \
  -lgmp \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/cddlib-gmp-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/cddlib-gmp-test" |
  grep -F "cddlib-ok h-to-v=4 v-to-h=4 arithmetic=GMP rational"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  "$src_dir/test-cddlib.c" \
  -I"$dist_dir/include" \
  -L"$dist_dir/lib" \
  -lcdd \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/cddlib-double-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/cddlib-double-test" |
  grep -F "cddlib-ok h-to-v=4 v-to-h=4 arithmetic=C double"
