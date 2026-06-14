#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 5 ]; then
  echo "usage: test-clang-standalone.sh BUILD_DIR DIST_DIR BIN_DIR NATIVE_F2C SRC_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
native_f2c="$(cd "$(dirname "$4")" && pwd)/$(basename "$4")"
src_dir="$(cd "$5" && pwd)"
jobs="${JOBS:-8}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_clang_standalone_probe "f2c" "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir/include" "$dist_dir/lib" "$dist_dir/test"

cd "$build_dir/libf2c"
rm -f *.o libf2c.a arith.h signal1.h sysdep1.h arithchk
sed -i.bak \
  -e 's/zig ar r libf2c.a/$(AR) r libf2c.a/' \
  -e 's/-zig ranlib libf2c.a/-$(RANLIB) libf2c.a/' \
  makefile.u

env COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-cc" \
  -Oz -DNO_FPINIT arithchk.c -lm -o arithchk
cowasm_clang_standalone_run_wasi "$bin_dir" ./arithchk >arith.h
rm -f arithchk

COWASM_TOOLCHAIN=clang make -j"$jobs" \
  CC="$bin_dir/cowasm-cc" \
  CFLAGS="-Oz" \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  -f makefile.u

cp libf2c.a "$dist_dir/lib/libf2c.a"
cp "$build_dir/f2c/f2c.h" "$dist_dir/include/f2c.h"
echo '#define main_ main' >>"$dist_dir/include/f2c.h"

cp "$src_dir/hello.f" "$dist_dir/test/hello.f"
cd "$dist_dir/test"
"$native_f2c" hello.f
env COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-cc" \
  -Oz -fvisibility-main hello.c -o hello \
  -I"$dist_dir/include" -L"$dist_dir/lib" -lf2c
cowasm_clang_standalone_run_wasi "$bin_dir" ./hello | grep "Hello, world!"
