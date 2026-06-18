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

cowasm_standalone_probe "buckygen" wasi-sdk "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir/bin" "$dist_dir/share/doc/buckygen"

cd "$build_dir"
env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -Oz \
  -Wall \
  -Wno-deprecated-non-prototype \
  -fvisibility-main \
  -Wl,-z,stack-size=1048576 \
  buckygen.c \
  -o "$dist_dir/bin/buckygen"
ln -sf buckygen "$dist_dir/bin/buckygen.wasm"
cp buckygen-guide.txt "$dist_dir/share/doc/buckygen/"

count_log="$probe_dir/buckygen-count.log"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/buckygen" \
  20 -u >"$count_log" 2>&1
grep -F "15 fullerenes generated" "$count_log"

ipr_log="$probe_dir/buckygen-ipr60.log"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/buckygen" \
  60 -I -u >"$ipr_log" 2>&1
grep -F "6063 fullerenes generated" "$ipr_log"

graph6_log="$probe_dir/buckygen-graph6.log"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/buckygen" \
  20 -g -q >"$graph6_log" 2>&1
test "$(grep -c '^S|eMID' "$graph6_log")" -eq 15

planar_file="$probe_dir/buckygen20.planar"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/buckygen" \
  20 -q "$planar_file"
grep -aqF ">>planar_code<<" "$planar_file"
test "$(wc -c < "$planar_file")" -eq 1950

echo "buckygen-ok count ipr-c60 graph6 planar-code"
