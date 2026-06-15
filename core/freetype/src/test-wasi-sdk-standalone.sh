#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR ZLIB_DIST_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
zlib_dist_dir="$4"
jobs="${JOBS:-8}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "freetype" wasi-sdk "$bin_dir" "$probe_dir"

zlib_dist_dir="$(cd "$zlib_dist_dir" && pwd)"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

cd "$build_dir"
mkdir -p bits
echo "typedef int __jmp_buf;" >bits/setjmp.h
cat >setjmp.h <<'EOF'
#ifndef COWASM_FREETYPE_WASI_SDK_SETJMP_H
#define COWASM_FREETYPE_WASI_SDK_SETJMP_H

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
CFLAGS="-Oz -I$build_dir -I$zlib_dist_dir/include -L$zlib_dist_dir/lib" \
COWASM_TOOLCHAIN=wasi-sdk \
  ./configure \
    --prefix="$dist_dir" \
    --host=none \
    --disable-shared \
    --enable-static \
    --with-zlib=yes \
    --with-bzip2=no \
    --with-png=no \
    --with-harfbuzz=no \
    --with-brotli=no

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make install

mkdir -p "$dist_dir/include/bits"
cp bits/setjmp.h "$dist_dir/include/bits/setjmp.h"
cp setjmp.h "$dist_dir/include/setjmp.h"

cat >"$probe_dir/freetype-test.c" <<'EOF'
#include <ft2build.h>
#include FT_FREETYPE_H

int main(void) {
  FT_Library library;
  if (FT_Init_FreeType(&library)) return 1;
  FT_Done_FreeType(library);
  return 0;
}
EOF

COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -fvisibility-main \
  -I"$dist_dir/include" \
  -I"$dist_dir/include/freetype2" \
  -I"$zlib_dist_dir/include" \
  -L"$dist_dir/lib" \
  -L"$zlib_dist_dir/lib" \
  "$probe_dir/freetype-test.c" \
  -lfreetype -lz \
  -o "$probe_dir/freetype-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/freetype-test"
