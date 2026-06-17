#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_parent="$(mkdir -p "$(dirname "$2")" && cd "$(dirname "$2")" && pwd)"
dist_dir="$dist_parent/$(basename "$2")"
bin_dir="$(cd "$3" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "saclib" wasi-sdk "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir/include" "$dist_dir/lib"

cd "$build_dir"
export saclib="$build_dir"

bin/sconf wasi
bin/mkproto
bin/mkmake

env \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CC="$bin_dir/cowasm-cc" \
  COWASM_TOOLCHAIN=wasi-sdk \
    make -C lib/objo \
      SACFLAG="-Oz -DFE_ALL_EXCEPT=0 -DFE_DIVBYZERO=0 -DFE_UNDERFLOW=0 -DFE_OVERFLOW=0 -DFE_INVALID=0" \
      EXTENSION=o

cp lib/saclibo.a "$dist_dir/lib/libsaclib.a"
cp include/*.h "$dist_dir/include/"

test -f "$dist_dir/lib/libsaclib.a"
test -f "$dist_dir/include/saclib.h"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -Oz \
  -fvisibility-main \
  -I"$dist_dir/include" \
  "$src_dir/test-saclib.c" \
  "$dist_dir/lib/libsaclib.a" \
  -lwasi-emulated-process-clocks \
  -lm \
  -o "$probe_dir/test-saclib"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/test-saclib" |
  grep -F "saclib-ok abs=42 sign=-1 even=1"
