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

cowasm_standalone_probe "m4ri" wasi-sdk "$bin_dir" "$probe_dir"

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
  CC_FOR_BUILD="zig cc ${ZIG_NATIVE_CFLAGS:-}" \
  CFLAGS="-Oz -fPIC -fvisibility-main" \
  LDFLAGS="${standalone_ldlibs[*]}" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --disable-shared \
      --enable-static \
      --disable-sse2 \
      --disable-png \
      --with-cachesize=32768:262144:8388608

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make install

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  "$src_dir/test-m4ri.c" \
  -I"$dist_dir/include" \
  -L"$dist_dir/lib" \
  -lm4ri \
  -lm \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/m4ri-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/m4ri-test" |
  grep -F "m4ri-ok rank=2 product=1011 solve kernel inverse"

cat >"$probe_dir/m4ri-side.c" <<'EOF'
#include <m4ri/m4ri.h>

__attribute__((visibility("default")))
int m4ri_side_smoke(void) {
  mzd_t *a = mzd_init(2, 2);
  mzd_t *b = mzd_init(2, 2);
  if (a == NULL || b == NULL) {
    mzd_free(a);
    mzd_free(b);
    return 0;
  }

  mzd_write_bit(a, 0, 0, 1);
  mzd_write_bit(a, 1, 1, 1);
  mzd_write_bit(b, 0, 1, 1);
  mzd_write_bit(b, 1, 0, 1);

  mzd_t *product = mzd_mul(NULL, a, b, 0);
  int ok = product != NULL &&
           mzd_read_bit(product, 0, 1) &&
           mzd_read_bit(product, 1, 0);

  mzd_free(product);
  mzd_free(a);
  mzd_free(b);
  return ok;
}
EOF

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -shared \
  -fPIC \
  "$probe_dir/m4ri-side.c" \
  -I"$dist_dir/include" \
  -L"$dist_dir/lib" \
  -lm4ri \
  -lm \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/m4ri-side.so"
