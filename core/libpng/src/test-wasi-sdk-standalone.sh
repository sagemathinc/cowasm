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

cat >"$probe_dir/setjmp-probe.c" <<'EOF'
#include <setjmp.h>

int main(void) {
  jmp_buf env;

  if (setjmp(env) == 0) {
    longjmp(env, 1);
  }

  return 0;
}
EOF

sjlj_cflags="-Oz -fvisibility-main -mllvm -wasm-enable-sjlj -mllvm -wasm-use-legacy-eh=false"
standalone_ldlibs=(-lsetjmp)
setjmp_log="$probe_dir/setjmp-probe.log"

if ! env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  $sjlj_cflags \
  "$probe_dir/setjmp-probe.c" \
  -lsetjmp \
  -o "$probe_dir/setjmp-probe" >"$setjmp_log" 2>&1; then
  if grep -E "Setjmp/longjmp support|__wasm_(setjmp|longjmp)" "$setjmp_log" >/dev/null; then
    echo "Skipping libpng wasi-sdk standalone smoke: wasi-sdk setjmp support is not configured."
    cat "$setjmp_log"
    exit 77
  fi
  cowasm_clang_standalone_skip_if_unconfigured "libpng" "$setjmp_log"
  cat "$setjmp_log"
  exit 1
fi

if ! cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/setjmp-probe" >"$setjmp_log" 2>&1; then
  if grep -E "Exception|setjmp|longjmp|__wasm" "$setjmp_log" >/dev/null; then
    echo "Skipping libpng wasi-sdk standalone smoke: WASI runner cannot execute wasi-sdk setjmp output."
    cat "$setjmp_log"
    exit 77
  fi
  cat "$setjmp_log"
  exit 1
fi

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

cd "$build_dir"
CC="$bin_dir/cowasm-cc" \
AR="$bin_dir/cowasm-ar" \
RANLIB="$bin_dir/cowasm-ranlib" \
CPPFLAGS="-I$build_dir -I$zlib_dist_dir/include -DCLOCK_PROCESS_CPUTIME_ID=CLOCK_MONOTONIC" \
CFLAGS="$sjlj_cflags" \
LDFLAGS="-L$zlib_dist_dir/lib ${standalone_ldlibs[*]}" \
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
  LIBS="$probe_dir/compat.o -lz ${standalone_ldlibs[*]}"

mkdir -p "$dist_dir/lib" "$dist_dir/include"
cp .libs/libpng16.a "$dist_dir/lib/libpng.a"
cp png.h pngconf.h pnglibconf.h "$dist_dir/include/"

cat >"$probe_dir/libpng-sjlj-test.c" <<'EOF'
#include <png.h>
#include <stdio.h>

int main(void) {
  png_structp png = png_create_read_struct(PNG_LIBPNG_VER_STRING, NULL, NULL, NULL);
  if (png == NULL) {
    return 1;
  }

  if (setjmp(png_jmpbuf(png))) {
    png_destroy_read_struct(&png, NULL, NULL);
    puts("libpng setjmp recovery ok");
    return 0;
  }

  png_error(png, "intentional libpng setjmp smoke");
  png_destroy_read_struct(&png, NULL, NULL);
  return 2;
}
EOF

COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  $sjlj_cflags \
  "$probe_dir/libpng-sjlj-test.c" \
  -I"$dist_dir/include" \
  -I"$zlib_dist_dir/include" \
  -L"$dist_dir/lib" \
  -L"$zlib_dist_dir/lib" \
  -lpng \
  -lz \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/libpng-sjlj-test"

cowasm_clang_standalone_run_wasi \
  "$bin_dir" "$probe_dir/libpng-sjlj-test" \
  >"$probe_dir/libpng-sjlj-test.out" 2>&1
grep -F "libpng setjmp recovery ok" "$probe_dir/libpng-sjlj-test.out"

cowasm_clang_standalone_run_wasi \
  "$bin_dir" ./timepng --assemble "$probe_dir/timepng.dat" "$build_dir/pngnow.png" \
  >"$probe_dir/timepng.out"
grep -F "$probe_dir/timepng.dat 1" "$probe_dir/timepng.out"
