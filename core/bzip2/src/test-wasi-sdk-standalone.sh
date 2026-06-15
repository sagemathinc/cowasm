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
cp "$src_dir/extra_config.h" .
cat >wasi_sdk_standalone_config.h <<'EOF'
#ifndef COWASM_BZIP2_WASI_SDK_STANDALONE_CONFIG_H
#define COWASM_BZIP2_WASI_SDK_STANDALONE_CONFIG_H

#include "extra_config.h"

#ifdef __wasi__
#define fchmod(fd, mode) (0)
#define fchown(fd, owner, gid) (0)
typedef void (*cowasm_signal_handler_t)(int);
static inline cowasm_signal_handler_t cowasm_signal(int sig, cowasm_signal_handler_t func) {
  (void)sig;
  return func;
}
#define signal(sig, func) cowasm_signal((sig), (func))
#endif

#endif
EOF
grep -Fq 'wasi_sdk_standalone_config.h' bzlib.h || \
  echo '#include "wasi_sdk_standalone_config.h"' >> bzlib.h

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs" \
  AR="$bin_dir/cowasm-ar" \
  CC="$bin_dir/cowasm-cc" \
  CFLAGS="-Oz -fvisibility-main" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  PREFIX="$dist_dir" \
  install

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/bzip2" --help \
  >"$probe_dir/bzip2-help.out" 2>"$probe_dir/bzip2-help.err"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/bunzip2" --help \
  >"$probe_dir/bunzip2-help.out" 2>"$probe_dir/bunzip2-help.err"
grep -F "Version 1.0.8" "$probe_dir/bzip2-help.err"
grep -F "Version 1.0.8" "$probe_dir/bunzip2-help.err"

test_dir="$probe_dir/bzip2-roundtrip"
mkdir -p "$test_dir"
printf 'coWasm wasi-sdk bzip2 smoke\n' >"$test_dir/message.txt"
cp "$test_dir/message.txt" "$test_dir/original.txt"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/bzip2" "$test_dir/message.txt"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/bunzip2" "$test_dir/message.txt.bz2"
cmp "$test_dir/original.txt" "$test_dir/message.txt"
