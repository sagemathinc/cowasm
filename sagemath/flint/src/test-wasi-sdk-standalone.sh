#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 5 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR GMP_DIR MPFR_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
gmp_dir="$(cd "$4" && pwd)"
mpfr_dir="$(cd "$5" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "flint" wasi-sdk "$bin_dir" "$probe_dir"

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
  LD="$bin_dir/wasi-sdk-wasm-ld-next" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CC="$bin_dir/cowasm-cc" \
  CC_FOR_BUILD="zig cc ${ZIG_NATIVE_CFLAGS:-}" \
  CPPFLAGS="-I$gmp_dir/include -I$mpfr_dir/include" \
  CFLAGS="-Oz -include $src_dir/cowasm_fenv_compat.h" \
  LDFLAGS="-L$gmp_dir/lib -L$mpfr_dir/lib ${standalone_ldlibs[*]}" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --with-gmp="$gmp_dir" \
      --with-mpfr="$mpfr_dir" \
      --disable-shared \
      --enable-static \
      --disable-pthread \
      --disable-thread-safe \
      --disable-assembly

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs" LD="$bin_dir/wasi-sdk-wasm-ld-next"
COWASM_TOOLCHAIN=wasi-sdk make install LD="$bin_dir/wasi-sdk-wasm-ld-next"

cat >"$probe_dir/flint-wasi-stubs.c" <<'EOF'
#include <errno.h>
#include <time.h>

int mkstemp(char *template) {
  (void)template;
  errno = ENOSYS;
  return -1;
}

clock_t clock(void) {
  return (clock_t)0;
}
EOF

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -c "$probe_dir/flint-wasi-stubs.c" \
  -o "$probe_dir/flint-wasi-stubs.o"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  "$src_dir/test-flint.c" \
  "$probe_dir/flint-wasi-stubs.o" \
  -I"$dist_dir/include" \
  -I"$mpfr_dir/include" \
  -I"$gmp_dir/include" \
  -L"$dist_dir/lib" \
  -L"$mpfr_dir/lib" \
  -L"$gmp_dir/lib" \
  -lflint \
  -lmpfr \
  -lgmp \
  -lm \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/flint-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/flint-test" |
  grep "flint-ok rational=1/2 bernoulli=-691/2730 factors=2 integer-factor=360 arith=partitions,crt,powmod poly-gcd=x-2 poly-transform=resultant,discriminant,compose finite-field-factors=2 fmpz-mod-factors=2 fq=gf9 mpoly=zmod7 q-poly-derivative=5/2x^2-3 q-mpoly=Qxy matrix-det=22 mod-solve=1,2,3 arb-hypgeom=gamma,erf,bessel ball-poly=16 roots=+i,-i qqbar=sqrt2,i"
