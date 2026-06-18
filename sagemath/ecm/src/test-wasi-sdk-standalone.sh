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

cowasm_standalone_probe "ecm" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

standalone_cflags=(
  -D_WASI_EMULATED_GETPID
  -D_WASI_EMULATED_PROCESS_CLOCKS
)
standalone_ldlibs=(
  -lwasi-emulated-signal
  -lwasi-emulated-process-clocks
  -lwasi-emulated-getpid
)
rm -rf "$dist_dir"

cd "$build_dir"
autoreconf -i
env \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CC="$bin_dir/cowasm-cc" \
  CC_FOR_BUILD="zig cc ${ZIG_NATIVE_CFLAGS:-}" \
  CPPFLAGS="-I$gmp_dir/include" \
  CFLAGS="-Oz -fvisibility-main ${standalone_cflags[*]}" \
  LDFLAGS="-L$gmp_dir/lib ${standalone_ldlibs[*]}" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --with-gmp="$gmp_dir" \
      --disable-shared \
      --enable-static \
      --disable-asm-redc \
      --disable-sse2 \
      --disable-openmp

# WASI has fcntl(), but not the advisory-lock constants used for resume files.
sed -i'.original' -e 's/#define HAVE_FCNTL 1/\/\* #undef HAVE_FCNTL \*\//' config.h

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs" libecm.la
COWASM_TOOLCHAIN=wasi-sdk make \
  install-libLTLIBRARIES \
  install-includeHEADERS

test -f "$dist_dir/include/ecm.h"
test -f "$dist_dir/lib/libecm.a"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  "$src_dir/test-ecm.c" \
  -I"$dist_dir/include" \
  -I"$gmp_dir/include" \
  -L"$dist_dir/lib" \
  -L"$gmp_dir/lib" \
  -lecm \
  -lgmp \
  -lm \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/ecm-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/ecm-test" |
  grep "ecm-ok pm1-status=1 pm1-factor=2 ecm-status=2 ecm-factor=30210181 version=7.0.7"
