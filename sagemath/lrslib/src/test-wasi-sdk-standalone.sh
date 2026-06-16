#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR GMP_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
gmp_dir="$(cd "$4" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "lrslib" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

sjlj_cflags="-mllvm -wasm-enable-sjlj -mllvm -wasm-use-legacy-eh=false"
standalone_ldlibs=(-lsetjmp -lwasi-emulated-signal)
standalone_ldflags="$sjlj_cflags -Wl,-z,stack-size=8388608 ${standalone_ldlibs[*]}"
rm -rf "$dist_dir"

cd "$build_dir"
env \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CC="$bin_dir/cowasm-cc" \
  CPPFLAGS="-I$gmp_dir/include" \
  CFLAGS="-Oz -fvisibility-main $sjlj_cflags -include $src_dir/lrslib-wasi-compat.h" \
  LDFLAGS="-L$gmp_dir/lib $standalone_ldflags" \
  LIBS="-lgmp" \
  ac_cv_sizeof_long=4 \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --disable-shared \
      --enable-static \
      --disable-mplrs

common_cppflags="-DTIMES -DSIGNALS -I$gmp_dir/include"
COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs" \
  lrs \
  lrsnash \
  liblrs.la \
  AM_CPPFLAGS="$common_cppflags" \
  lrs1_CPPFLAGS="-DLRSLONG $common_cppflags" \
  redund1_CPPFLAGS="-DLRSLONG $common_cppflags" \
  liblrs1_la_CPPFLAGS="-DMA -DSAFE -DLRSLONG $common_cppflags" \
  liblrs2_la_CPPFLAGS="-DMA -DSAFE -DB128 -DLRSLONG $common_cppflags" \
  liblrsgmp_la_CPPFLAGS="-DMA -DGMP $common_cppflags" \
  liblrs_la_CPPFLAGS="$common_cppflags" \
  lrs_CPPFLAGS="-DMA $common_cppflags" \
  lrsnash_CPPFLAGS="-DGMP -DMA $common_cppflags"

mkdir -p "$dist_dir/bin" "$dist_dir/include" "$dist_dir/lib" "$dist_dir/share/lrslib/doc/examples"
cp lrs lrsnash "$dist_dir/bin/"
cp lrslib.h lrsdriver.h lrsgmp.h lrslong.h lrsmp.h lrsrestart.h "$dist_dir/include/"
cp .libs/liblrs.a "$dist_dir/lib/"
"$bin_dir/cowasm-ranlib" "$dist_dir/lib/liblrs.a"
cp -R games "$dist_dir/share/lrslib/doc/examples/"

cube_input="$probe_dir/cube.ine"
volume_input="$probe_dir/volume.ine"
cp "$build_dir/cube.ine" "$cube_input"
cp "$build_dir/ext/test/cut16_11.ext" "$volume_input"
printf '\nvolume\n' >>"$volume_input"

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/lrs" "$cube_input" |
  grep -F "*Totals: vertices=8 rays=0 bases=8 integer_vertices=8"

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/lrs" "$volume_input" |
  grep -F "*Volume=32768/14175"

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/lrsnash" "$build_dir/games/game" |
  grep -F "*Number of equilibria found: 3"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  $sjlj_cflags \
  -DMA \
  -DGMP \
  -DTIMES \
  -DSIGNALS \
  "$build_dir/lpdemo.c" \
  -I"$dist_dir/include" \
  -I"$gmp_dir/include" \
  -L"$dist_dir/lib" \
  -L"$gmp_dir/lib" \
  -llrs \
  -lgmp \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/lrslib-lpdemo"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/lrslib-lpdemo" |
  grep -F "Objective value =  50"

echo "lrslib-ok lrs-vertices=8 volume=32768/14175 lrsnash static-lpdemo"
