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

cowasm_standalone_probe "zn-poly" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

standalone_ldlibs=(-lwasi-emulated-signal)
rm -rf "$dist_dir"

cd "$build_dir"
env COWASM_TOOLCHAIN=wasi-sdk \
  python makemakefile.py \
    --prefix="$dist_dir" \
    --gmp-prefix="$gmp_dir" \
    --cflags="-Oz -fvisibility-main" \
    --ldflags="-L$gmp_dir/lib ${standalone_ldlibs[*]}" \
    --disable-tuning \
    > makefile

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs" \
  CC="$bin_dir/cowasm-cc" \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib"

COWASM_TOOLCHAIN=wasi-sdk make install \
  CC="$bin_dir/cowasm-cc" \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -fvisibility-main \
  "$src_dir/test-zn-poly.c" \
  -I"$dist_dir/include" \
  -I"$gmp_dir/include" \
  -L"$dist_dir/lib" \
  -L"$gmp_dir/lib" \
  -lzn_poly \
  -lgmp \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/zn-poly-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/zn-poly-test" |
  grep -F "zn-poly-ok product middle scalar sub mod-inverse"
