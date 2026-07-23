#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "cliquer" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

rm -rf "$dist_dir"

cd "$build_dir"
env \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CC="$bin_dir/cowasm-cc" \
  CFLAGS="-Oz -fPIC" \
  ac_cv_func_malloc_0_nonnull=yes \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --disable-shared \
      --enable-static

COWASM_TOOLCHAIN=wasi-sdk make clean
COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make install

mkdir -p "$dist_dir/lib/pkgconfig"
cat >"$dist_dir/lib/pkgconfig/libcliquer.pc" <<EOF
prefix=$dist_dir
libdir=\${prefix}/lib
includedir=\${prefix}/include

Name: libcliquer
Description: Exact clique search library
Version: 1.22
Libs: -L\${libdir} -lcliquer
Cflags: -I\${includedir}
EOF

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -fvisibility-main \
  "$src_dir/test-cliquer.c" \
  -I"$dist_dir/include" \
  -L"$dist_dir/lib" \
  -lcliquer \
  -o "$probe_dir/cliquer-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/cliquer-test" |
  grep "cliquer-ok max=3 clique=111 all=3 weight=11 weighted=11 edges=5"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  --experimental-pic \
  -shared \
  -fPIC \
  "$src_dir/test-cliquer.c" \
  -I"$dist_dir/include" \
  "$dist_dir/lib/libcliquer.a" \
  -o "$probe_dir/cliquer-test.so"

"$bin_dir/wasi-sdk-llvm-objdump-next" -h "$probe_dir/cliquer-test.so" |
  grep -F 'dylink.0'
