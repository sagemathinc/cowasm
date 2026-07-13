#!/usr/bin/env bash
set -euo pipefail

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
gmp_dir="$(cd "$4" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"
dylink_archive="$(cd "$(dirname "$5")" && pwd)/$(basename "$5")"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "mpfr" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

standalone_ldlibs=(-lwasi-emulated-signal)
rm -rf "$dist_dir"

cd "$build_dir"
env \
  ABI=standard \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CC="$bin_dir/cowasm-cc" \
  CC_FOR_BUILD="zig cc ${ZIG_NATIVE_CFLAGS:-}" \
  CPPFLAGS="-I$gmp_dir/include" \
  CFLAGS="-Oz -fPIC -fvisibility-main" \
  LDFLAGS="-L$gmp_dir/lib ${standalone_ldlibs[*]}" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --with-gmp="$gmp_dir" \
      --disable-shared \
      --enable-static \
      --disable-thread-safe

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make install

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  "$src_dir/test-mpfr.c" \
  -I"$dist_dir/include" \
  -I"$gmp_dir/include" \
  -L"$dist_dir/lib" \
  -L"$gmp_dir/lib" \
  -lmpfr \
  -lgmp \
  -lm \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/mpfr-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/mpfr-test" |
  grep -F "mpfr-ok pi exp log sqrt exact-div directed-rounding flags mpz parse-state special-functions nextafter fma rootn hypot trig special-values"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -shared \
  -fPIC \
  "$src_dir/test-mpfr-side.c" \
  -I"$dist_dir/include" \
  -I"$gmp_dir/include" \
  -L"$dist_dir/lib" \
  -L"$gmp_dir/lib" \
  -lmpfr \
  -lgmp \
  -lm \
  -o "$probe_dir/mpfr-side.so"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -O0 \
  -fPIC \
  -fvisibility-main \
  "$src_dir/test-mpfr-dylink.c" \
  "$dylink_archive" \
  -Wl,--import-memory \
  -Wl,--import-table \
  -Wl,--allow-undefined \
  -Wl,--allow-multiple-definition \
  -Wl,--export-all \
  -Wl,--export=malloc \
  -Wl,--export=free \
  -Wl,--export=raise \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/app.wasm"

(
  cd "$probe_dir"
  COWASM_DYLINK_CALL_MAIN_CTORS=0 \
    node "$repo_dir/core/dylink/test/wasi/app.js"
) | grep -F "mpfr-side-ok parse-state"
