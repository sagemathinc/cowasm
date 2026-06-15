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
compat_dir="$probe_dir/compat"
mkdir -p "$compat_dir"

cowasm_standalone_probe "lua" wasi-sdk "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir/bin" "$dist_dir/include" "$dist_dir/lib"

cd "$build_dir"
cat >"$compat_dir/setjmp.h" <<'EOF'
#ifndef COWASM_LUA_WASI_SDK_SETJMP_H
#define COWASM_LUA_WASI_SDK_SETJMP_H

typedef int jmp_buf[1];

static inline int setjmp(jmp_buf env) {
  (void)env;
  return 0;
}

_Noreturn void _Exit(int status);

static inline void longjmp(jmp_buf env, int status) __attribute__((noreturn));
static inline void longjmp(jmp_buf env, int status) {
  (void)env;
  _Exit(status == 0 ? 1 : status);
}

#endif
EOF
cat >"$compat_dir/compat.c" <<'EOF'
#include <stddef.h>
#include <stdio.h>
#include <time.h>

void __SIG_ERR(int signum) {
  (void)signum;
}

void __SIG_IGN(int signum) {
  (void)signum;
}

void (*signal(int signum, void (*handler)(int)))(int) {
  (void)signum;
  return handler;
}

clock_t clock(void) {
  return 0;
}

FILE *tmpfile(void) {
  return NULL;
}

char *tmpnam(char *name) {
  (void)name;
  return NULL;
}

int system(const char *command) {
  (void)command;
  return -1;
}
EOF
env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -c "$compat_dir/compat.c" -o "$probe_dir/compat.o"

COWASM_TOOLCHAIN=wasi-sdk make clean
COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs" \
  CC="$bin_dir/cowasm-cc" \
  AR="$bin_dir/cowasm-ar rc" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CFLAGS="-Wall -Oz -fvisibility-main -std=c99 -DL_tmpnam=32 -I$compat_dir" \
  MYCFLAGS= \
  MYLDFLAGS="$probe_dir/compat.o" \
  MYLIBS=

cp lua "$dist_dir/bin/lua"
cp liblua.a "$dist_dir/lib/liblua.a"
cp lua.h luaconf.h lualib.h lauxlib.h "$dist_dir/include/"

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/lua" "$src_dir/sum.lua" |
  grep 50000005000000
