#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 5 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR GMP_DIR CDDLIB_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
gmp_dir="$(cd "$4" && pwd)"
cddlib_dir="$(cd "$5" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "topcom" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

clangxx="$bin_dir/wasi-sdk-clang++-next"
libcxx_noeh="$("$clangxx" -target wasm32-wasip1 -print-file-name=libc++.a)"
libcxx="${libcxx_noeh%/noeh/libc++.a}/eh/libc++.a"
libcxxabi="${libcxx_noeh%/noeh/libc++.a}/eh/libc++abi.a"
libunwind="${libcxx_noeh%/noeh/libc++.a}/eh/libunwind.a"
if [ ! -f "$libcxx" ] || [ ! -f "$libcxxabi" ] || [ ! -f "$libunwind" ]; then
  echo "topcom: missing exception-enabled wasi-sdk C++ runtime archives" >&2
  echo "  $libcxx" >&2
  echo "  $libcxxabi" >&2
  echo "  $libunwind" >&2
  exit 77
fi

rm -rf "$dist_dir"

cd "$build_dir"

mkdir -p external/include external/lib external/cddlib-0.94j-TOPCOMb
cp -f "$gmp_dir"/include/gmp*.h external/include/
cp -f "$gmp_dir"/lib/libgmp*.a external/lib/
cp -f "$cddlib_dir"/lib/libcddgmp.a external/lib/
for header in "$cddlib_dir"/include/cddlib/*.h; do
  ln -sf "$header" "external/include/$(basename "$header")"
done
touch external/cdd_done

env \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CC="$bin_dir/cowasm-cc" \
  CXX="$bin_dir/cowasm-c++" \
  CPPFLAGS="-I$gmp_dir/include -I$cddlib_dir/include/cddlib" \
  CFLAGS="-Oz" \
  CXXFLAGS="-Oz" \
  LDFLAGS="-L$gmp_dir/lib -L$cddlib_dir/lib -lwasi-emulated-signal" \
  LIBS="-lgmpxx -lgmp $libcxx $libcxxabi $libunwind" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir"

make_vars=(
  AM_CXXFLAGS="-fvisibility=hidden -fvisibility-inlines-hidden -std=c++17"
  CXXFLAGS="-Oz"
  LDFLAGS="-L../external/lib -L$gmp_dir/lib -L$cddlib_dir/lib -lwasi-emulated-signal"
  LIBS="-lgmpxx -lgmp $libcxx $libcxxabi $libunwind"
)

COWASM_TOOLCHAIN=wasi-sdk make -C lib-src-reg -j"$jobs" "${make_vars[@]}"
COWASM_TOOLCHAIN=wasi-sdk make -C lib-src -j"$jobs" "${make_vars[@]}"
COWASM_TOOLCHAIN=wasi-sdk make -C src -j"$jobs" points2ntriangs.o points2facets.o "${make_vars[@]}"

link_topcom_tool() {
  local tool="$1"
  # Link selected tools directly to avoid the wrapper's full-executable strip path.
  "$clangxx" \
      -target wasm32-wasip1 \
      -fvisibility=hidden \
      -fvisibility-inlines-hidden \
      -std=c++17 \
      -O0 \
      -L../external/lib \
      -L"$gmp_dir/lib" \
      -L"$cddlib_dir/lib" \
      -o "$tool" \
      "${tool}.o" \
      ../lib-src/libTOPCOM.a \
      ../lib-src-reg/libCHECKREG.a \
      ../external/lib/libcddgmp.a \
      -lgmpxx \
      -lgmp \
      "$libcxx" \
      "$libcxxabi" \
      "$libunwind" \
      -lwasi-emulated-signal
}

cd "$build_dir/src"
link_topcom_tool points2ntriangs
link_topcom_tool points2facets
cd "$build_dir"

mkdir -p "$dist_dir/bin"
cp -f src/points2ntriangs src/points2facets "$dist_dir/bin/"

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/points2ntriangs" \
  < "$build_dir/examples/cyclic_4_2.dat" |
  grep -x "1"

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/points2facets" \
  < "$build_dir/examples/cube_2.dat" |
  grep -F "{0,1}"
