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

cowasm_standalone_probe "nauty" wasi-sdk "$bin_dir" "$probe_dir"

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
  CFLAGS="-Oz" \
  LDFLAGS="-Wl,-z,stack-size=1048576" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --disable-shared \
      --enable-static \
      --disable-interrupt \
      --disable-popcnt \
      --disable-clz \
      --enable-generic

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make install

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  "$src_dir/test-nauty.c" \
  -I"$dist_dir/include" \
  -L"$dist_dir/lib" \
  -lnauty \
  -o "$probe_dir/nauty-test"

library_log="$probe_dir/library.log"
cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/nauty-test" >"$library_log"
grep -F "nauty-ok cycle=5 automorphisms=10 orbit=transitive" "$library_log"
grep -F "nauty-ok traces cycle=5 automorphisms=10 orbit=transitive" "$library_log"

graph_file="$probe_dir/connected4.g6"
count_log="$probe_dir/countg.log"
show_log="$probe_dir/showg.log"

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/geng" 4 -c >"$graph_file"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/countg" <"$graph_file" >"$count_log"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/showg" <"$graph_file" >"$show_log"

grep -F "6 graphs altogether" "$count_log"
grep -F "Graph 6, order 4." "$show_log"
grep -F "  0 : 1 2 3;" "$show_log"

large_bipartite_file="$probe_dir/bipartite-1-63.g6"
large_bipartite_log="$probe_dir/genbgL-1-63.log"
large_bipartite_count_log="$probe_dir/genbgL-1-63-count.log"
ktree_file="$probe_dir/ktree-8.g6"
ktree_count_log="$probe_dir/ktree-8-count.log"

cowasm_clang_standalone_run_wasi \
  "$bin_dir" "$dist_dir/bin/genbgL" 1 63 \
  >"$large_bipartite_file" 2>"$large_bipartite_log"
cowasm_clang_standalone_run_wasi \
  "$bin_dir" "$dist_dir/bin/countg" \
  <"$large_bipartite_file" >"$large_bipartite_count_log"

grep -F "64 graphs generated" "$large_bipartite_log"
grep -F "64 graphs altogether" "$large_bipartite_count_log"

cowasm_clang_standalone_run_wasi \
  "$bin_dir" "$dist_dir/bin/genktreeg" 8 \
  >"$ktree_file"
cowasm_clang_standalone_run_wasi \
  "$bin_dir" "$dist_dir/bin/countg" \
  <"$ktree_file" >"$ktree_count_log"

grep -F "39 graphs altogether" "$ktree_count_log"

echo "nauty-ok library geng genbgL genktreeg countg showg"
