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
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_clang_standalone_probe "bzip2" "$bin_dir" "$probe_dir"

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

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/bzip2" --help \
  >"$probe_dir/bzip2-help.out" 2>"$probe_dir/bzip2-help.err"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/bunzip2" --help \
  >"$probe_dir/bunzip2-help.out" 2>"$probe_dir/bunzip2-help.err"
grep -F "Version 1.0.8" "$probe_dir/bzip2-help.err"
grep -F "Version 1.0.8" "$probe_dir/bunzip2-help.err"
