#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR SRC_DIR" >&2
  exit 2
fi

build_dir="$1"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
src_dir="$(cd "$4" && pwd)"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "coreutils" wasi-sdk "$bin_dir" "$probe_dir"

rm -rf "$build_dir" "$dist_dir"
mkdir -p "$build_dir/compat" "$dist_dir/bin"

cat >"$build_dir/compat/compat.h" <<'EOF'
#ifndef COWASM_COREUTILS_WASI_SDK_BASENAME_COMPAT_H
#define COWASM_COREUTILS_WASI_SDK_BASENAME_COMPAT_H

void setprogname(const char *progname);
const char *getprogname(void);
extern const char *__progname;

#endif
EOF

cat >"$build_dir/compat/compat.c" <<'EOF'
#include <err.h>
#include <errno.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static const char *cowasm_progname = "basename";

void setprogname(const char *progname) {
  (void)progname;
}

const char *getprogname(void) {
  return cowasm_progname;
}

void err(int eval, const char *fmt, ...) {
  va_list ap;
  va_start(ap, fmt);
  vfprintf(stderr, fmt, ap);
  va_end(ap);
  fprintf(stderr, ": %s\n", strerror(errno));
  exit(eval);
}
EOF

cflags=(
  -Oz
  -I"$build_dir/compat"
  -I"$src_dir/compat"
)

COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  "${cflags[@]}" \
  -c "$build_dir/compat/compat.c" \
  -o "$build_dir/compat.o"

build_utility() {
  local utility="$1"

  COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
    "${cflags[@]}" \
    -fvisibility-main \
    -c "$src_dir/utils/$utility/$utility.c" \
    -o "$build_dir/$utility.o"

  COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
    -Oz \
    -fvisibility-main \
    "$build_dir/$utility.o" \
    "$build_dir/compat.o" \
    -o "$dist_dir/bin/$utility"
}

build_utility basename
build_utility dirname

test "$(cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/basename" foo/bar.txt .txt)" = "bar"
test "$(cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/dirname" foo/bar.txt)" = "foo"
test "$(cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/dirname" /)" = "/"
