#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR TERMCAP_DIST_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
termcap_dist_dir="$(cd "$4" && pwd)"
jobs="${JOBS:-8}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cat >"$probe_dir/probe.c" <<'EOF'
int main(int argc, char **argv) {
  return argc == 0 || argv == 0;
}
EOF

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  "$probe_dir/probe.c" -o "$probe_dir/probe.wasm"
env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -c "$probe_dir/probe.c" -o "$probe_dir/probe.o"
env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-ar" \
  rc "$probe_dir/libprobe.a" "$probe_dir/probe.o"
env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-ranlib" \
  "$probe_dir/libprobe.a"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

cd "$build_dir"

CFLAGS="-Oz -I$build_dir/src -I$termcap_dist_dir/include -D__STDC_ISO_10646__=201103L -D__wasilibc_unmodified_upstream_signal" \
LDFLAGS="-L$termcap_dist_dir/lib -ltermcap" \
CONFIG_SITE="$script_dir/config.site" \
RANLIB="$bin_dir/cowasm-ranlib" \
AR="$bin_dir/cowasm-ar" \
CC="$bin_dir/cowasm-cc -Oz" \
COWASM_TOOLCHAIN=wasi-sdk \
  ./configure \
    --build="$(./config.guess)" \
    --host=none \
    --prefix="$dist_dir"

echo '#include "extra_config.h"' >> config.h
printf 'all:\ninstall:\n' > examples/Makefile

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make install

cp -rv "$script_dir/readline" "$dist_dir/include"

cat >"$probe_dir/libedit-test.c" <<'EOF'
#include <histedit.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
  History *hist;
  HistEvent ev;
  Tokenizer *tok;
  LineInfo line;
  const char *argv_buffer[] = {"alpha", "beta gamma", 0};
  const char **argv = argv_buffer;
  int argc = 0;
  int cursor_arg = -1;
  int cursor_offset = -1;
  int status;

  hist = history_init();
  if (hist == 0) return 1;
  if (history(hist, &ev, H_SETSIZE, 8) == -1) return 2;
  if (history(hist, &ev, H_ENTER, "factor 2023\n") == -1) return 3;
  if (history(hist, &ev, H_LAST) == -1) return 4;
  if (strcmp(ev.str, "factor 2023\n") != 0) return 5;

  tok = tok_init(0);
  if (tok == 0) return 6;

  line.buffer = "alpha 'beta gamma'";
  line.cursor = line.buffer + strlen(line.buffer);
  line.lastchar = line.cursor;

  status = tok_line(tok, &line, &argc, &argv, &cursor_arg, &cursor_offset);
  if (status != 0) return 7;
  if (argc != 2) return 8;
  if (strcmp(argv[0], "alpha") != 0) return 9;
  if (strcmp(argv[1], "beta gamma") != 0) return 10;
  if (cursor_arg != 1) return 11;
  if (cursor_offset != 10) return 12;

  tok_end(tok);
  history_end(hist);
  return 0;
}
EOF

COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -fvisibility-main \
  -I"$dist_dir/include" \
  -I"$build_dir" \
  -I"$build_dir/src" \
  -I"$termcap_dist_dir/include" \
  -L"$dist_dir/lib" \
  -L"$termcap_dist_dir/lib" \
  "$probe_dir/libedit-test.c" \
  -ledit \
  -ltermcap \
  -o "$probe_dir/libedit-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/libedit-test"
