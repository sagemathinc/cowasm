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

cowasm_standalone_probe "ratpoints" wasi-sdk "$bin_dir" "$probe_dir"

standalone_ldlibs=(-lwasi-emulated-signal)
sources=(sift.c init.c sturm.c find_points.c)

rm -rf "$dist_dir"
mkdir -p "$dist_dir/include" "$dist_dir/lib" "$dist_dir/bin"

cd "$build_dir"

cc_for_build="${CC_FOR_BUILD:-cc}"
"$cc_for_build" -DRATPOINTS_LONG_LENGTH=32 -I"$gmp_dir/include" gen_init_sieve_h.c -o gen_init_sieve_h
./gen_init_sieve_h >init_sieve.h
"$cc_for_build" -DRATPOINTS_LONG_LENGTH=32 -I"$gmp_dir/include" gen_find_points_h.c -o gen_find_points_h
./gen_find_points_h >find_points.h

for source in "${sources[@]}"; do
  env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
    -Oz \
    -fvisibility-main \
    -Wno-constant-conversion \
    -Wno-shift-negative-value \
    -I"$gmp_dir/include" \
    -c "$source" \
    -o "${source%.c}.o"
done

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-ar" \
  rc libratpoints.a sift.o init.o sturm.o find_points.o
env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-ranlib" libratpoints.a

cp ratpoints.h "$dist_dir/include/"
cp libratpoints.a "$dist_dir/lib/"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -Oz \
  -fvisibility-main \
  -Wno-constant-conversion \
  -Wno-shift-negative-value \
  -I"$dist_dir/include" \
  -I"$gmp_dir/include" \
  main.c \
  "$dist_dir/lib/libratpoints.a" \
  -L"$gmp_dir/lib" \
  -lgmp \
  -lm \
  "${standalone_ldlibs[@]}" \
  -o "$dist_dir/bin/ratpoints"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -Oz \
  -fvisibility-main \
  -Wno-constant-conversion \
  -Wno-shift-negative-value \
  -I"$dist_dir/include" \
  -I"$gmp_dir/include" \
  rptest.c \
  "$dist_dir/lib/libratpoints.a" \
  -L"$gmp_dir/lib" \
  -lgmp \
  -lm \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/ratpoints-rptest"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/ratpoints-rptest" -z -h 20 >/dev/null

curve_output="$(
  cowasm_clang_standalone_run_wasi \
    "$bin_dir" \
    "$dist_dir/bin/ratpoints" \
    "0 1" \
    10 \
    -q
)"
curve_points="$(printf '%s\n' "$curve_output" | sed '/^$/d' | wc -l)"
if [ "$curve_points" -ne 16 ]; then
  printf '%s\n' "$curve_output"
  echo "ratpoints: expected 16 rational points on y^2 = x up to height 10" >&2
  exit 1
fi

for expected_point in \
  "(1 : 0 : 0)" \
  "(0 : 0 : 1)" \
  "(9 : 6 : 4)" \
  "(4 : -6 : 9)"; do
  if ! printf '%s\n' "$curve_output" | grep -Fx "$expected_point" >/dev/null; then
    printf '%s\n' "$curve_output"
    echo "ratpoints: missing expected point $expected_point" >&2
    exit 1
  fi
done

echo "ratpoints-ok rptest curve-points=$curve_points"
