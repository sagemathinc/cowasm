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

cowasm_standalone_probe "glpk" wasi-sdk "$bin_dir" "$probe_dir"

sjlj_flags=(-mllvm -wasm-enable-sjlj -mllvm -wasm-use-legacy-eh=false)
standalone_ldlibs=(-lsetjmp -lwasi-emulated-signal)

setjmp_log="$probe_dir/setjmp-probe.log"
cat >"$probe_dir/setjmp-probe.c" <<'EOF'
#include <setjmp.h>

static jmp_buf env;

int main(void) {
  if (setjmp(env) == 0) {
    longjmp(env, 1);
  }
  return 0;
}
EOF

if ! env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -Oz \
  "${sjlj_flags[@]}" \
  "$probe_dir/setjmp-probe.c" \
  -lsetjmp \
  -o "$probe_dir/setjmp-probe" >"$setjmp_log" 2>&1; then
  if grep -E "Setjmp/longjmp support|__wasm_(setjmp|longjmp)" "$setjmp_log" >/dev/null; then
    echo "Skipping glpk wasi-sdk standalone smoke: wasi-sdk setjmp support is not configured."
    cat "$setjmp_log"
    exit 77
  fi
  cowasm_clang_standalone_skip_if_unconfigured "glpk" "$setjmp_log"
  cat "$setjmp_log"
  exit 1
fi

if ! cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/setjmp-probe" >"$setjmp_log" 2>&1; then
  if grep -E "Exception|setjmp|longjmp|__wasm" "$setjmp_log" >/dev/null; then
    echo "Skipping glpk wasi-sdk standalone smoke: WASI runner cannot execute wasi-sdk setjmp output."
    cat "$setjmp_log"
    exit 77
  fi
  cat "$setjmp_log"
  exit 1
fi

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

rm -rf "$dist_dir"

cd "$build_dir"
env \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CC="$bin_dir/cowasm-cc" \
  CC_FOR_BUILD="zig cc ${ZIG_NATIVE_CFLAGS:-}" \
  CPPFLAGS="-I$gmp_dir/include" \
  CFLAGS="-Oz -fvisibility-main ${sjlj_flags[*]}" \
  LDFLAGS="-L$gmp_dir/lib ${sjlj_flags[*]} ${standalone_ldlibs[*]}" \
  LIBS="-lgmp" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --with-gmp \
      --disable-shared \
      --enable-static \
      --disable-dl \
      --disable-odbc \
      --disable-mysql

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make install

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  "${sjlj_flags[@]}" \
  "$src_dir/test-glpk.c" \
  -I"$dist_dir/include" \
  -I"$gmp_dir/include" \
  -L"$dist_dir/lib" \
  -L"$gmp_dir/lib" \
  -lglpk \
  -lgmp \
  -lm \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/glpk-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/glpk-test" |
  grep -F "glpk-ok simplex=76 exact=76 mip=6 maxflow=5"
