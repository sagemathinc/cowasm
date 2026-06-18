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

cowasm_standalone_probe "mcqd" wasi-sdk "$bin_dir" "$probe_dir"

standalone_ldlibs=(-lwasi-emulated-process-clocks)
clangxx="$bin_dir/wasi-sdk-clang++-next"
default_libcxxabi="$("$clangxx" -target wasm32-wasip1 -print-file-name=libc++abi.a)"
libcxxabi="${default_libcxxabi%/noeh/libc++abi.a}/eh/libc++abi.a"
libunwind="${default_libcxxabi%/noeh/libc++abi.a}/eh/libunwind.a"
if [ ! -f "$libcxxabi" ] || [ ! -f "$libunwind" ]; then
  echo "cowasm: mcqd standalone smoke requires pinned wasi-sdk exception archives" >&2
  echo "  $libcxxabi" >&2
  echo "  $libunwind" >&2
  exit 77
fi

cat >"$probe_dir/small.clq" <<'EOF'
p edge 5 5
e 1 2
e 1 3
e 2 3
e 3 4
e 4 5
EOF

rm -rf "$dist_dir"
mkdir -p "$dist_dir/bin" "$dist_dir/include/mcqd" "$dist_dir/share/mcqd"

"$clangxx" \
  -target wasm32-wasip1 \
  -Dmain='__attribute__((visibility("default")))main' \
  -D_WASI_EMULATED_PROCESS_CLOCKS \
  "$build_dir/mcqd.cpp" \
  "$libcxxabi" \
  "$libunwind" \
  "${standalone_ldlibs[@]}" \
  -o "$dist_dir/bin/mcqd.wasm"

cp "$build_dir/mcqd.h" "$dist_dir/include/mcqd/mcqd.h"
cp "$probe_dir/small.clq" "$dist_dir/share/mcqd/small.clq"
ln -sf mcqd.wasm "$dist_dir/bin/mcqd"

"$clangxx" \
  -target wasm32-wasip1 \
  -Dmain='__attribute__((visibility("default")))main' \
  "$src_dir/test-mcqd.cpp" \
  -I"$dist_dir/include" \
  "$libcxxabi" \
  "$libunwind" \
  -o "$probe_dir/mcqd-test.wasm"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/mcqd-test.wasm" |
  grep "mcqd-ok max=3 clique=111 steps=4 dyn-steps=4"

cli_output="$(
  cowasm_clang_standalone_run_wasi \
    "$bin_dir" "$dist_dir/bin/mcqd.wasm" "$dist_dir/share/mcqd/small.clq"
)"
printf '%s\n' "$cli_output" | grep "Maximum clique: 2 1 3"
test "$(printf '%s\n' "$cli_output" | grep -c "Size = 3")" -eq 2
