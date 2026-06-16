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

cowasm_standalone_probe "symmetrica" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

standalone_ldlibs=(-lwasi-emulated-signal)
rm -rf "$dist_dir"

cd "$build_dir"
env \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CC="$bin_dir/cowasm-cc" \
  CFLAGS="-Oz -fvisibility-main" \
  LDFLAGS="${standalone_ldlibs[*]}" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --disable-shared \
      --enable-static

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make install

cat >"$probe_dir/symmetrica-wasi-stubs.c" <<'EOF'
#include <time.h>

clock_t clock(void) {
  return (clock_t)0;
}
EOF

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -c "$probe_dir/symmetrica-wasi-stubs.c" \
  -o "$probe_dir/symmetrica-wasi-stubs.o"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  "$src_dir/test-symmetrica.c" \
  "$probe_dir/symmetrica-wasi-stubs.o" \
  -I"$dist_dir/include" \
  -L"$dist_dir/lib" \
  -lsymmetrica \
  -lm \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/symmetrica-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/symmetrica-test" |
  grep "symmetrica-ok factorial=39916800 pascal schur=3"
