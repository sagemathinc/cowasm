#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: test-clang-standalone.sh BUILD_DIR DIST_DIR BIN_DIR SRC_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
src_dir="$(cd "$4" && pwd)"
jobs="${JOBS:-8}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_clang_standalone_probe "gmp" "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

standalone_ldlibs=(
  -lwasi-emulated-signal
)

cd "$build_dir"
ABI=standard \
AR="$bin_dir/cowasm-ar" \
RANLIB="$bin_dir/cowasm-ranlib" \
CC="$bin_dir/cowasm-cc" \
CC_FOR_BUILD="zig cc ${ZIG_NATIVE_CFLAGS:-}" \
CFLAGS="-Oz -fvisibility-main" \
LDFLAGS="${standalone_ldlibs[*]}" \
COWASM_TOOLCHAIN=clang \
  ./configure \
    --build=i686-pc-linux-gnu \
    --host=none \
    --prefix="$dist_dir" \
    --disable-assembly \
    --disable-shared \
    --enable-static

sed -i'.original' -e 's/HAVE_OBSTACK_VPRINTF 1/HAVE_OBSTACK_VPRINTF 0/' config.h
COWASM_TOOLCHAIN=clang make -j"$jobs" install

COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-cc" \
  -fvisibility-main \
  -Oz \
  -I"$dist_dir/include" \
  -L"$dist_dir/lib" \
  "$src_dir/test-gmp.c" \
  -lgmp \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/test-gmp"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/test-gmp" |
  grep -F "gmp-ok integer=2^200 rational=1/2 gcd=1 inverse=2753 powm=445"
