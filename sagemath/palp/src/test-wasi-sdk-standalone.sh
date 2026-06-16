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

cowasm_standalone_probe "palp" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

standalone_ldlibs=(-Wl,-z,stack-size=8388608 -lwasi-emulated-process-clocks)
rm -rf "$dist_dir"

cd "$build_dir"
COWASM_TOOLCHAIN=wasi-sdk make -f GNUmakefile cleanall
COWASM_TOOLCHAIN=wasi-sdk make -f GNUmakefile -j"$jobs" \
  CC="$bin_dir/cowasm-cc" \
  CPPFLAGS="-D_FILE_OFFSET_BITS=64 -D_LARGEFILE_SOURCE -include $src_dir/palp-wasi-compat.h" \
  CFLAGS="-Oz -fvisibility-main" \
  LDFLAGS="${standalone_ldlibs[*]}" \
  poly-4d.x \
  class-4d.x \
  cws-4d.x \
  nef-4d.x \
  mori-4d.x

mkdir -p "$dist_dir/bin" "$dist_dir/share/palp/tests"
cp poly-4d.x class-4d.x cws-4d.x nef-4d.x mori-4d.x "$dist_dir/bin/"
cp -R tests/input "$dist_dir/share/palp/tests/"

cat tests/input/2.1-polytope-input.txt |
  cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/poly-4d.x" -f |
  grep -F "M:6 3 F:3"

cat tests/input/3.2.7-poly-e.1.txt |
  cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/poly-4d.x" -ef |
  grep -F "3 2  Equations of P"

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/cws-4d.x" -w2 |
  grep -F "6  1 2 3  rt  #=3  #cand=3"

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/nef-4d.x" -h |
  grep -F "calculate Hodge numbers of nef-partitions"

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/mori-4d.x" -h |
  grep -F "Mori cone of the corresponding toric ambient spaces"

printf 'e\n' |
  cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/class-4d.x" -h |
  grep -F "classifying reflexive polytopes"

echo "palp-ok poly-counts equations cws nef mori class"
