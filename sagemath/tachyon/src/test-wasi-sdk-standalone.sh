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

cowasm_standalone_probe "tachyon" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

rm -rf "$dist_dir"
mkdir -p "$dist_dir/bin" "$dist_dir/share/tachyon/scenes"

env COWASM_TOOLCHAIN=wasi-sdk make -C "$build_dir/unix" -j"$jobs" all \
  ARCH=wasi \
  CC="$bin_dir/wasi-sdk-clang-next" \
  CFLAGS="-Wall -Oz -DWASI -DPOSIXTIME" \
  AR="$bin_dir/wasi-sdk-llvm-ar-next" \
  ARFLAGS=rc \
  RANLIB="$bin_dir/wasi-sdk-llvm-ranlib-next" \
  STRIP=true \
  LIBS="-L. -ltachyon -lm"

cp "$build_dir/compile/wasi/tachyon" "$dist_dir/bin/tachyon"
cp "$build_dir/scenes/null.dat" "$dist_dir/share/tachyon/scenes/null.dat"

render_log="$probe_dir/tachyon-render.log"
cowasm_clang_standalone_run_wasi \
  "$bin_dir" \
  "$dist_dir/bin/tachyon" \
  "$dist_dir/share/tachyon/scenes/null.dat" \
  -format PPM \
  -o "$probe_dir/null.ppm" >"$render_log" 2>&1

grep -F "Tachyon Parallel/Multiprocessor Ray Tracer" "$render_log"
grep -F "Ray Tracing Time:" "$render_log"
head -c 3 "$probe_dir/null.ppm" | grep -F "P6" >/dev/null

echo "tachyon-ok render-ppm"
