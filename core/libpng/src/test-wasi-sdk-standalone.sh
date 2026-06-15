#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR ZLIB_DIST_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
zlib_dist_dir="$(cd "$4" && pwd)"
jobs="${JOBS:-8}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "libpng" wasi-sdk "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

cd "$build_dir"
cat >setjmp.h <<'EOF'
#ifndef COWASM_LIBPNG_WASI_SDK_SETJMP_H
#define COWASM_LIBPNG_WASI_SDK_SETJMP_H

typedef int jmp_buf[1];

#define setjmp(env) (0)

_Noreturn void _Exit(int status);

static inline void longjmp(jmp_buf env, int status) {
  (void)env;
  _Exit(status == 0 ? 1 : status);
}

#endif
EOF
CC="$bin_dir/cowasm-cc" \
AR="$bin_dir/cowasm-ar" \
RANLIB="$bin_dir/cowasm-ranlib" \
CPPFLAGS="-I$build_dir -I$zlib_dist_dir/include -DCLOCK_PROCESS_CPUTIME_ID=CLOCK_MONOTONIC" \
CFLAGS="-Oz -fvisibility-main" \
LDFLAGS="-L$zlib_dist_dir/lib" \
COWASM_TOOLCHAIN=wasi-sdk \
  ./configure \
    --prefix="$dist_dir" \
    --host=none \
    --disable-shared \
    --enable-static

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs" libpng16.la

cat >"$probe_dir/compat.c" <<'EOF'
#include <stdio.h>

FILE *tmpfile(void) {
  return NULL;
}
EOF
COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -c "$probe_dir/compat.c" -o "$probe_dir/compat.o"

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs" timepng \
  LIBS="$probe_dir/compat.o -lz"

mkdir -p "$dist_dir/lib" "$dist_dir/include"
cp .libs/libpng16.a "$dist_dir/lib/libpng.a"
cp png.h pngconf.h pnglibconf.h "$dist_dir/include/"

cowasm_clang_standalone_run_wasi \
  "$bin_dir" ./timepng --assemble "$probe_dir/timepng.dat" "$build_dir/pngnow.png" \
  >"$probe_dir/timepng.out"
grep -F "$probe_dir/timepng.dat 1" "$probe_dir/timepng.out"
