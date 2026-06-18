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

cowasm_standalone_probe "benzene" wasi-sdk "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir/bin"

cd "$build_dir"
env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -Oz \
  -Wall \
  -Wno-deprecated-non-prototype \
  -DNOLOG \
  -fvisibility-main \
  benzene.c \
  -o "$dist_dir/bin/benzene"

planar_file="$probe_dir/benzene2.planar"
bec_file="$probe_dir/benzene2.bec"
benzenoid_file="$probe_dir/benzene3b.planar"

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/benzene" \
  2 p f "$planar_file"
grep -aqF ">>planar_code<<" "$planar_file"
test "$(wc -c < "$planar_file")" -eq 48

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/benzene" \
  2 B f "$bec_file"
grep -qxF "55" "$bec_file"

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/benzene" \
  3 b p f "$benzenoid_file"
grep -aqF ">>planar_code<<" "$benzenoid_file"
test "$(wc -c < "$benzenoid_file")" -eq 153

echo "benzene-ok planar-code bec benzenoids"
