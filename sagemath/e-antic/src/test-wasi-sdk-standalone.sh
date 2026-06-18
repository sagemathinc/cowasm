#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 7 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR GMP_DIR MPFR_DIR FLINT_DIR BOOST_CROPPED_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
gmp_dir="$(cd "$4" && pwd)"
mpfr_dir="$(cd "$5" && pwd)"
flint_dir="$(cd "$6" && pwd)"
boost_cropped_dir="$(cd "$7" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "e-antic" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

standalone_ldlibs=(-lwasi-emulated-signal)
rm -rf "$dist_dir"

cd "$build_dir/libeantic"
env \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CC="$bin_dir/cowasm-cc" \
  CXX="$bin_dir/cowasm-c++" \
  CPPFLAGS="-I$flint_dir/include -I$mpfr_dir/include -I$gmp_dir/include -I$boost_cropped_dir/include" \
  CFLAGS="-Oz" \
  CXXFLAGS="-Oz -fvisibility=hidden -fvisibility-inlines-hidden" \
  LDFLAGS="-L$flint_dir/lib -L$mpfr_dir/lib -L$gmp_dir/lib ${standalone_ldlibs[*]}" \
  LIBS="-lflint -lmpfr -lgmp -lm ${standalone_ldlibs[*]}" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --host=wasm32-wasi \
      --build=x86_64-pc-linux-gnu \
      --prefix="$dist_dir" \
      --disable-shared \
      --enable-static \
      --without-benchmark \
      --without-byexample \
      --disable-dependency-tracking

COWASM_TOOLCHAIN=wasi-sdk make -C src -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make -C src install

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
  "$src_dir/test-e-antic.c" \
  "$probe_dir/flint-wasi-stubs.o" \
  -I"$dist_dir/include" \
  -I"$flint_dir/include" \
  -I"$mpfr_dir/include" \
  -I"$gmp_dir/include" \
  -L"$dist_dir/lib" \
  -L"$flint_dir/lib" \
  -L"$mpfr_dir/lib" \
  -L"$gmp_dir/lib" \
  -leantic \
  -lflint \
  -lmpfr \
  -lgmp \
  -lm \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/e-antic-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/e-antic-test" |
  grep "e-antic-ok degree=2 relation=1 sign=1 floor=1 cubic-degree=3 cubic-relation=1 inverse=1 quotient=1 ordering=1 field=NumberField(a^2 - 2"
