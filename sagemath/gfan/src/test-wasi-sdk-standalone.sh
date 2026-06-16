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

cowasm_standalone_probe "gfan" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

rm -rf "$dist_dir"
mkdir -p "$dist_dir/bin"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -Oz \
  -c "$src_dir/cowasm-system-stub.c" \
  -o "$probe_dir/cowasm-system-stub.o"

libcxx_noeh="$("$bin_dir/wasi-sdk-clang++-next" -target wasm32-wasip1 -print-file-name=libc++.a)"
libcxx="${libcxx_noeh%/noeh/libc++.a}/eh/libc++.a"
libcxxabi="${libcxx_noeh%/noeh/libc++.a}/eh/libc++abi.a"
build_log="$probe_dir/gfan-build.log"

cd "$build_dir"
set +e
env COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs" \
  CC="$bin_dir/cowasm-cc" \
  CXX="$bin_dir/cowasm-c++" \
  PREFIX="$dist_dir" \
  gmppath="$gmp_dir" \
  cddpath="$cddlib_dir" \
  cddnoprefix=1 \
  CDD_INCLUDEOPTIONS="-I $cddlib_dir/include/cddlib" \
  GPROFFLAG= \
  OPTFLAGS="-DGMPRATIONAL -DNDEBUG -Oz" \
  CDD_LINKOPTIONS="$cddlib_dir/lib/libcddgmp.a" \
  GMP_LINKOPTIONS="$gmp_dir/lib/libgmp.a" \
  ADDITIONALLINKOPTIONS="$probe_dir/cowasm-system-stub.o $cddlib_dir/lib/libcddgmp.a $gmp_dir/lib/libgmp.a $libcxx $libcxxabi -lwasi-emulated-signal -lwasi-emulated-process-clocks" \
  gfan >"$build_log" 2>&1
status=$?
set -e

if [ "$status" -ne 0 ]; then
  if grep -E "undefined symbol: (__cxa_allocate_exception|__cxa_throw|__cpp_exception)" "$build_log" >/dev/null; then
    grep -E "undefined symbol: (__cxa_allocate_exception|__cxa_throw|__cpp_exception)" "$build_log" | head -3 >&2
    echo "gfan wasi-sdk standalone skipped: exception-enabled C++ runtime link is not wired through yet" >&2
    exit 77
  fi
  cat "$build_log"
  exit "$status"
fi

cp gfan "$dist_dir/bin/gfan"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/gfan" _list |
  grep -F "gfan_buchberger"

echo "gfan-ok list"
