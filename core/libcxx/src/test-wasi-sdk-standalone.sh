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

link_log="$probe_dir/link.log"
cowasm_clang_standalone_run_or_skip "libcxx" "$link_log" \
  "$wasm_ld" \
    --experimental-pic \
    -shared \
    --allow-undefined \
    --no-entry \
    --export-all \
    -u __divdc3 \
    -u __muldc3 \
    --whole-archive "$libcxx" "$libcxxabi" --no-whole-archive "$compiler_rt" \
    -o "$dist_dir/libcxx.so"

test -s "$dist_dir/libcxx.so"
"$objdump" -h "$dist_dir/libcxx.so" | grep 'dylink.0'

if "$strings" "$dist_dir/libcxx.so" | grep -E 'lib(c|c\+\+|c\+\+abi)\.so'; then
  echo "unexpected needed_dynlibs from wasi-sdk libcxx side module" >&2
  exit 1
fi
