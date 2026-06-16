#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR SRC_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
src_dir="$(cd "$4" && pwd)"
jobs="${JOBS:-8}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../../core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "gmp" wasi-sdk "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

standalone_ldlibs=(
  -lwasi-emulated-signal
)

cc_for_build="${CC_FOR_BUILD:-cc}"
if [ -z "${CC_FOR_BUILD:-}" ] && [ -x "$bin_dir/zig" ]; then
  cc_for_build="$bin_dir/zig cc ${ZIG_NATIVE_CFLAGS:-}"
fi

cd "$build_dir"
ABI=standard \
AR="$bin_dir/cowasm-ar" \
RANLIB="$bin_dir/cowasm-ranlib" \
CC="$bin_dir/cowasm-cc" \
CXX="$bin_dir/cowasm-c++" \
CC_FOR_BUILD="$cc_for_build" \
CFLAGS="-Oz -fvisibility-main" \
CXXFLAGS="-Oz -fvisibility-main" \
LDFLAGS="${standalone_ldlibs[*]}" \
COWASM_TOOLCHAIN=wasi-sdk \
  ./configure \
    --build=i686-pc-linux-gnu \
    --host=none \
    --prefix="$dist_dir" \
    --disable-assembly \
    --disable-shared \
    --enable-static \
    --enable-cxx

sed -i'.original' -e 's/HAVE_OBSTACK_VPRINTF 1/HAVE_OBSTACK_VPRINTF 0/' config.h
COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs" install

COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
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

COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-c++" \
  -fvisibility-main \
  -Oz \
  -I"$dist_dir/include" \
  -L"$dist_dir/lib" \
  "$src_dir/test-gmpxx.cpp" \
  -lgmpxx \
  -lgmp \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/test-gmpxx"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/test-gmpxx" |
  grep -F "gmpxx-ok integer=2^200 rational=1/2 gcd=1 inverse=2753 powm=445"
