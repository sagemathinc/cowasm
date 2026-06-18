#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR GMP_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
gmp_dir="$(cd "$4" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "normaliz" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

clangxx="$bin_dir/wasi-sdk-clang++-next"
default_libcxxabi="$("$clangxx" -target wasm32-wasip1 -print-file-name=libc++abi.a)"
libcxxabi="${default_libcxxabi%/noeh/libc++abi.a}/eh/libc++abi.a"
libunwind="${default_libcxxabi%/noeh/libc++abi.a}/eh/libunwind.a"
if [ ! -f "$libcxxabi" ] || [ ! -f "$libunwind" ]; then
  echo "cowasm: normaliz standalone smoke requires pinned wasi-sdk exception archives" >&2
  echo "  $libcxxabi" >&2
  echo "  $libunwind" >&2
  exit 77
fi

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -Oz \
  -c "$src_dir/cowasm-system-stub.c" \
  -o "$probe_dir/cowasm-system-stub.o"

cd "$build_dir"

env \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CC="$bin_dir/cowasm-cc" \
  CXX="$bin_dir/cowasm-c++" \
  CPPFLAGS="-I$gmp_dir/include" \
  CFLAGS="-O0" \
  CXXFLAGS="-O0" \
  LDFLAGS="-L$gmp_dir/lib" \
  LIBS="-lgmpxx -lgmp" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=x86_64-pc-linux-gnu \
      --host=wasm32-wasip1 \
      --prefix="$dist_dir" \
      --disable-openmp \
      --disable-shared \
      --enable-static \
      --without-cocoalib \
      --without-e-antic \
      --without-flint \
      --without-nauty \
      --with-gmp="$gmp_dir"

env COWASM_TOOLCHAIN=wasi-sdk make -C source -j"$jobs" libnormaliz.la normaliz.o
env COWASM_TOOLCHAIN=wasi-sdk make -C source normaliz \
  LIBS="$probe_dir/cowasm-system-stub.o -lgmpxx -lgmp $libcxxabi $libunwind"

mkdir -p "$dist_dir/bin" "$dist_dir/include/libnormaliz" "$dist_dir/lib"
cp -f source/normaliz "$dist_dir/bin/"
cp -f source/.libs/libnormaliz.a "$dist_dir/lib/"
cp -f source/libnormaliz/*.h "$dist_dir/include/libnormaliz/"

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/normaliz" --version |
  grep -F "Normaliz 3.11.1"

cat >"$probe_dir/2cone_int.in" <<'EOF'
amb_space 2
strict_inequalities 2
-1  2
 3 -1
EOF

cowasm_clang_standalone_run_wasi \
  "$bin_dir" "$dist_dir/bin/normaliz" -N "$probe_dir/2cone_int" \
  >"$probe_dir/normaliz-cli.log"
grep -F "4 Hilbert basis elements of recession monoid" "$probe_dir/2cone_int.out"
grep -F "2 extreme rays of recession cone" "$probe_dir/2cone_int.out"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-c++" \
  -std=c++14 \
  -O0 \
  -I"$dist_dir/include" \
  -I"$gmp_dir/include" \
  "$src_dir/test-normaliz.cpp" \
  "$probe_dir/cowasm-system-stub.o" \
  "$dist_dir/lib/libnormaliz.a" \
  -L"$gmp_dir/lib" \
  -lgmpxx \
  -lgmp \
  "$libcxxabi" \
  "$libunwind" \
  -lwasi-emulated-signal \
  -o "$probe_dir/normaliz-lib-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/normaliz-lib-test" |
  grep -F "normaliz-lib-ok rows=2 cols=2"
