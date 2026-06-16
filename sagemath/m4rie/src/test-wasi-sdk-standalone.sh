#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR M4RI_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
m4ri_dir="$(cd "$4" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "m4rie" wasi-sdk "$bin_dir" "$probe_dir"

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
  CFLAGS="-Oz -fvisibility-main" \
  CPPFLAGS="-I$m4ri_dir/include" \
  LDFLAGS="-L$m4ri_dir/lib ${standalone_ldlibs[*]}" \
  M4RI_CFLAGS="-I$m4ri_dir/include" \
  M4RI_LIBS="-L$m4ri_dir/lib -lm4ri -lm" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --disable-shared \
      --enable-static \
      --with-m4ri="$m4ri_dir"

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make install

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  "$src_dir/test-m4rie.c" \
  -I"$dist_dir/include" \
  -I"$m4ri_dir/include" \
  -L"$dist_dir/lib" \
  -L"$m4ri_dir/lib" \
  -lm4rie \
  -lm4ri \
  -lm \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/m4rie-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/m4rie-test" |
  grep -F "m4rie-ok degree=2 product=0211 sum=2321"
