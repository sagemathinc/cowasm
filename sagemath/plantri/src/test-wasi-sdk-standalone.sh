#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_parent="$(mkdir -p "$(dirname "$2")" && cd "$(dirname "$2")" && pwd)"
dist_dir="$dist_parent/$(basename "$2")"
bin_dir="$(cd "$3" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "plantri" wasi-sdk "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir/bin" "$dist_dir/share/doc/plantri"

cd "$build_dir"

cflags=(
  -Oz
  -D_WASI_EMULATED_GETPID
  -D_WASI_EMULATED_PROCESS_CLOCKS
)
ldlibs=(
  "$src_dir/cowasm-system-stub.c"
  -lwasi-emulated-getpid
  -lwasi-emulated-process-clocks
)

build_program() {
  local out="$1"
  shift
  "$bin_dir/wasi-sdk-clang-next" \
    -target wasm32-wasip1 \
    "${cflags[@]}" \
    "$@" \
    "${ldlibs[@]}" \
    -o "$out"
}

build_program plantri plantri.c
build_program fullgen fullgen.c
build_program plantri_nft -DPLUGIN=nft.c plantri.c
build_program plantri_adj4 -DPLUGIN=adj4.c plantri.c
build_program plantri_maxd -DPLUGIN=maxdeg.c plantri.c
build_program plantri_mdcount -DPLUGIN=mdcount.c plantri.c
build_program plantri_ad -DPLUGIN=allowed_deg.c plantri.c
build_program plantri_deg -DPLUGIN=degseq.c plantri.c
build_program plantri_fo -DPLUGIN=faceorbits.c plantri.c

for program in \
  plantri \
  fullgen \
  plantri_nft \
  plantri_adj4 \
  plantri_maxd \
  plantri_mdcount \
  plantri_ad \
  plantri_deg \
  plantri_fo
do
  cp "$program" "$dist_dir/bin/"
  ln -sf "$program" "$dist_dir/bin/$program.wasm"
done
cp LICENSE-2.0.txt plantri-guide.txt fullgen-guide.txt "$dist_dir/share/doc/plantri/"

plantri_log="$probe_dir/plantri.log"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/plantri" -q -g 8 >"$plantri_log" 2>&1
grep -F 'GsT`_[' "$plantri_log"
grep -F "1 quadrangulations written to stdout" "$plantri_log"

fullgen_log="$probe_dir/fullgen.log"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/fullgen" 20 >"$fullgen_log" 2>&1
grep -F "Generated 1 maps on 20 vertices" "$fullgen_log"
grep -F "end of program" "$fullgen_log"

plugin_log="$probe_dir/plantri-deg.log"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/plantri_deg" -q 8 >"$plugin_log" 2>&1
grep -aF "33333333  1" "$plugin_log"
grep -aF "3- 3 : 1" "$plugin_log"

echo "plantri-ok plantri fullgen plugins"
