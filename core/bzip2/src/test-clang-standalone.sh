#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: test-clang-standalone.sh BUILD_DIR DIST_DIR BIN_DIR SRC_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
src_dir="$(cd "$4" && pwd)"
jobs="${JOBS:-8}"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

skip_pattern="requires '(clang|wasm-ld|llvm-ar|llvm-ranlib)'|requires a WASI sysroot|not an executable file|not a directory|not a file|WASI startup object not found"

skip_if_toolchain_unconfigured() {
  local log="$1"
  if grep -E "$skip_pattern" "$log" >/dev/null; then
    echo "Skipping bzip2 clang standalone smoke: direct clang/lld WASI toolchain is not configured."
    cat "$log"
    exit 77
  fi
}

cat >"$probe_dir/probe.c" <<'EOF'
int main(int argc, char **argv) {
  return argc == 0 || argv == 0;
}
EOF

probe_log="$probe_dir/probe.log"
if ! COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-cc" \
  "$probe_dir/probe.c" -o "$probe_dir/probe.wasm" >"$probe_log" 2>&1; then
  skip_if_toolchain_unconfigured "$probe_log"
  cat "$probe_log"
  exit 1
fi

archive_log="$probe_dir/archive.log"
COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-cc" \
  -c "$probe_dir/probe.c" -o "$probe_dir/probe.o" >"$archive_log" 2>&1 || {
  skip_if_toolchain_unconfigured "$archive_log"
  cat "$archive_log"
  exit 1
}
COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-ar" \
  rc "$probe_dir/libprobe.a" "$probe_dir/probe.o" >>"$archive_log" 2>&1 || {
  skip_if_toolchain_unconfigured "$archive_log"
  cat "$archive_log"
  exit 1
}
COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-ranlib" \
  "$probe_dir/libprobe.a" >>"$archive_log" 2>&1 || {
  skip_if_toolchain_unconfigured "$archive_log"
  cat "$archive_log"
  exit 1
}

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

cd "$build_dir"
cp "$src_dir/extra_config.h" .
cat >clang_standalone_config.h <<'EOF'
#ifndef COWASM_BZIP2_CLANG_STANDALONE_CONFIG_H
#define COWASM_BZIP2_CLANG_STANDALONE_CONFIG_H

#include "extra_config.h"

#ifdef __wasi__
#define fchmod(fd, mode) (0)
#define fchown(fd, owner, gid) (0)
#endif

#endif
EOF
grep -Fq 'clang_standalone_config.h' bzlib.h || \
  echo '#include "clang_standalone_config.h"' >> bzlib.h

COWASM_TOOLCHAIN=clang make -j"$jobs" \
  AR="$bin_dir/cowasm-ar" \
  CC="$bin_dir/cowasm-cc" \
  CFLAGS="-Oz -fvisibility-main" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  PREFIX="$dist_dir" \
  install

"$bin_dir/cowasm" "$dist_dir/bin/bzip2" --help \
  >"$probe_dir/bzip2-help.out" 2>"$probe_dir/bzip2-help.err"
"$bin_dir/cowasm" "$dist_dir/bin/bunzip2" --help \
  >"$probe_dir/bunzip2-help.out" 2>"$probe_dir/bunzip2-help.err"
grep -F "Version 1.0.8" "$probe_dir/bzip2-help.err"
grep -F "Version 1.0.8" "$probe_dir/bunzip2-help.err"
