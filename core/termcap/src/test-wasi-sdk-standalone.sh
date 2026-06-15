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

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "termcap" wasi-sdk "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

cd "$build_dir"
cp "$src_dir/config.h" .
rm -f config.cache libtermcap.a ./*.o

build_triple="${COWASM_BUILD_TRIPLE:-}"
if [ -z "$build_triple" ]; then
  if [ -x ./build-aux/config.guess ]; then
    build_triple="$(./build-aux/config.guess)"
  elif command -v cc >/dev/null 2>&1; then
    build_triple="$(cc -dumpmachine)"
  else
    build_triple="x86_64-pc-linux-gnu"
  fi
fi

RANLIB="$bin_dir/cowasm-ranlib" \
AR="$bin_dir/cowasm-ar" \
CC="$bin_dir/cowasm-cc -Oz -fPIC -DHAVE_CONFIG_H=1" \
COWASM_TOOLCHAIN=wasi-sdk \
  ./configure \
    --build="$build_triple" \
    --host=none \
    --prefix="$dist_dir"

COWASM_TOOLCHAIN=wasi-sdk make AR="$bin_dir/cowasm-ar" -j"$jobs" libtermcap.a

mkdir -p "$dist_dir/lib" "$dist_dir/include"
cp libtermcap.a "$dist_dir/lib/"
cp termcap.h "$dist_dir/include/"

if "$bin_dir/wasi-sdk-llvm-objdump-next" -r "$dist_dir/lib/libtermcap.a" | grep -E 'R_WASM_MEMORY_ADDR_(LEB|SLEB)\b'; then
  echo "termcap wasi-sdk archive contains non-PIC memory relocations" >&2
  exit 1
fi

cat >"$probe_dir/termcap-test.c" <<'EOF'
#include <stdlib.h>
#include <string.h>
#include <termcap.h>

int main(void) {
  char entry[2048];
  char area[256];
  char *area_ptr = area;
  char *clear;
  char *cursor;

  if (setenv("TERM", "cowasm", 1) != 0) return 1;
  if (setenv("TERMCAP",
             "cowasm|co:co#80:li#24:am:cl=\\E[H\\E[J:cm=\\E[%i%d;%dH:",
             1) != 0) return 2;

  if (tgetent(entry, "cowasm") != 1) return 3;
  if (tgetnum("co") != 80) return 4;
  if (tgetnum("li") != 24) return 5;
  if (!tgetflag("am")) return 6;

  clear = tgetstr("cl", &area_ptr);
  if (clear == 0 || strcmp(clear, "\033[H\033[J") != 0) return 7;

  cursor = tgoto(tgetstr("cm", &area_ptr), 4, 7);
  if (cursor == 0 || strcmp(cursor, "\033[8;5H") != 0) return 8;

  return 0;
}
EOF

COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -fvisibility-main \
  -I"$dist_dir/include" \
  -L"$dist_dir/lib" \
  "$probe_dir/termcap-test.c" \
  -ltermcap \
  -o "$probe_dir/termcap-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/termcap-test"
