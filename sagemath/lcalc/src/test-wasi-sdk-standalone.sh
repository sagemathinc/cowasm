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

cowasm_standalone_probe "lcalc" wasi-sdk "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir/include/lcalc" "$dist_dir/lib" "$probe_dir/obj"

cp "$build_dir"/src/libLfunction/*.h "$dist_dir/include/lcalc/"

cat >"$dist_dir/include/lcalc/config.h" <<'EOF'
#ifndef LCALC_CONFIG_H
#define LCALC_CONFIG_H

#define HAVE_GETOPT_H 1
#define HAVE_LIMITS_H 1
#define HAVE_MATH_H 1
#define HAVE_STDINT_H 1
#define HAVE_STDIO_H 1
#define HAVE_STDLIB_H 1
#define HAVE_STRING_H 1
#define HAVE_STRINGS_H 1
#define HAVE_SYS_STAT_H 1
#define HAVE_SYS_TYPES_H 1
#define HAVE_UNISTD_H 1
#define HAVE_LIBPARI 0
#define PRECISION_DOUBLE 1
#define PACKAGE "lcalc"
#define PACKAGE_NAME "lcalc"
#define PACKAGE_VERSION "2.1.0"
#define VERSION "2.1.0"

#endif
EOF

for source in "$build_dir"/src/libLfunction/*.cc; do
  object="$probe_dir/obj/$(basename "${source%.cc}").o"
  env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-c++" \
    -Oz \
    -std=gnu++17 \
    -I"$dist_dir/include/lcalc" \
    -I"$build_dir/src/libLfunction" \
    -c "$source" \
    -o "$object"
done

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-ar" \
  rc "$dist_dir/lib/libLfunction.a" "$probe_dir"/obj/*.o
env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-ranlib" \
  "$dist_dir/lib/libLfunction.a"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-c++" \
  -Oz \
  -std=gnu++17 \
  -I"$dist_dir/include" \
  "$src_dir/test-lcalc.cpp" \
  -L"$dist_dir/lib" \
  -lLfunction \
  -lwasi-emulated-process-clocks \
  -o "$probe_dir/lcalc-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/lcalc-test" |
  grep -F "lcalc-ok zeta-real=2.692619886 zeta-imag=-0.0203860296 zeta2-partial=1.643934567 zeta2-tail=9.08223555e-05 gcd=21 nextprime=1009 powmod=97"
