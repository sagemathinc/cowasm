#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "libcxx" wasi-sdk "$bin_dir" "$probe_dir"

clangxx="$bin_dir/wasi-sdk-clang++-next"
clang="$bin_dir/wasi-sdk-clang-next"
wasm_ld="$bin_dir/wasi-sdk-wasm-ld-next"
objdump="$bin_dir/wasi-sdk-llvm-objdump-next"
strings="$bin_dir/wasi-sdk-llvm-strings-next"

resolve_log="$probe_dir/resolve.log"
cowasm_clang_standalone_run_or_skip "libcxx" "$resolve_log" \
  "$clangxx" -target wasm32-wasip1 -print-file-name=libc++.a

libcxx="$("$clangxx" -target wasm32-wasip1 -print-file-name=libc++.a)"
libcxxabi="$("$clangxx" -target wasm32-wasip1 -print-file-name=libc++abi.a)"
compiler_rt="$("$clangxx" -target wasm32-wasip1 -print-libgcc-file-name)"

for archive in "$libcxx" "$libcxxabi" "$compiler_rt"; do
  if [ ! -f "$archive" ]; then
    echo "cowasm: libcxx standalone smoke requires the pinned wasi-sdk sysroot archive '$archive'" >&2
    exit 77
  fi
done

rm -rf "$dist_dir"
mkdir -p "$dist_dir" "$build_dir"

"$clang" -target wasm32-wasip1 \
  -O0 \
  -fPIC \
  -c "$script_dir/cxa-thread-atexit-stub.c" \
  -o "$build_dir/cxa-thread-atexit-stub.o"

"$clangxx" -target wasm32-wasip1 \
  -O0 \
  -fPIC \
  -c "$script_dir/cxx-data-exports.cpp" \
  -o "$build_dir/cxx-data-exports.o"

link_log="$probe_dir/link.log"
cowasm_clang_standalone_run_or_skip "libcxx" "$link_log" \
  "$wasm_ld" \
    --experimental-pic \
    -shared \
    --allow-undefined \
    --no-entry \
    --export-all \
    -u __addtf3 \
    -u __divdc3 \
    -u __divtf3 \
    -u __fixdfti \
    -u __fixunsdfti \
    -u __fixtfti \
    -u __floattidf \
    -u __floatsitf \
    -u __floatunditf \
    -u __floatunsitf \
    -u __floatuntidf \
    -u __floatuntitf \
    -u __muldc3 \
    -u __multf3 \
    -u __subtf3 \
    -u __ashldi3 \
    -u __ashlti3 \
    -u __ashrdi3 \
    -u __ashrti3 \
    -u __lshrdi3 \
    -u __lshrti3 \
    -u __moddi3 \
    -u __modsi3 \
    -u __modti3 \
    -u __udivdi3 \
    -u __udivmoddi4 \
    -u __udivmodsi4 \
    -u __udivmodti4 \
    -u __udivsi3 \
    -u __udivti3 \
    -u __umoddi3 \
    -u __umodsi3 \
    -u __umodti3 \
    --whole-archive "$libcxx" "$libcxxabi" --no-whole-archive "$compiler_rt" \
    "$build_dir/cxa-thread-atexit-stub.o" \
    "$build_dir/cxx-data-exports.o" \
    -o "$dist_dir/libcxx.so"

test -s "$dist_dir/libcxx.so"
"$objdump" -h "$dist_dir/libcxx.so" | grep 'dylink.0'

if "$strings" "$dist_dir/libcxx.so" | grep -E 'lib(c|c\+\+|c\+\+abi)\.so'; then
  echo "unexpected needed_dynlibs from wasi-sdk libcxx side module" >&2
  exit 1
fi
