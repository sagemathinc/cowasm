#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 6 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR GMP_DIR NTL_DIR PARI_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
gmp_dir="$(cd "$4" && pwd)"
ntl_dir="$(cd "$5" && pwd)"
pari_dir="$(cd "$6" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "eclib" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

standalone_ldlibs=(-lwasi-emulated-signal -lwasi-emulated-process-clocks)
sjlj_flags=(-mllvm -wasm-enable-sjlj -mllvm -wasm-use-legacy-eh=false)
default_libcxxabi="$("$bin_dir/wasi-sdk-clang++-next" -target wasm32-wasip1 -print-file-name=libc++abi.a)"
libcxxabi="${default_libcxxabi%/noeh/libc++abi.a}/eh/libc++abi.a"
libunwind="${default_libcxxabi%/noeh/libc++abi.a}/eh/libunwind.a"
if [ ! -f "$libcxxabi" ] || [ ! -f "$libunwind" ]; then
  echo "cowasm: eclib standalone smoke requires pinned wasi-sdk exception archives" >&2
  echo "  $libcxxabi" >&2
  echo "  $libunwind" >&2
  exit 77
fi

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
    echo "Skipping eclib wasi-sdk standalone smoke: wasi-sdk setjmp support is not configured."
    cat "$setjmp_log"
    exit 77
  fi
  cowasm_clang_standalone_skip_if_unconfigured "eclib" "$setjmp_log"
  cat "$setjmp_log"
  exit 1
fi

if ! cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/setjmp-probe" >"$setjmp_log" 2>&1; then
  if grep -E "Exception|setjmp|longjmp|__wasm" "$setjmp_log" >/dev/null; then
    echo "Skipping eclib wasi-sdk standalone smoke: WASI runner cannot execute wasi-sdk setjmp output."
    cat "$setjmp_log"
    exit 77
  fi
  cat "$setjmp_log"
  exit 1
fi

rm -rf "$dist_dir"

cd "$build_dir"
env \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CC="$bin_dir/cowasm-cc" \
  CXX="$bin_dir/cowasm-c++" \
  CPPFLAGS="-I$gmp_dir/include -I$ntl_dir/include -I$pari_dir/include" \
  CFLAGS="-Oz ${sjlj_flags[*]}" \
  CXXFLAGS="-Oz -std=c++17 ${sjlj_flags[*]}" \
  LDFLAGS="-L$gmp_dir/lib -L$ntl_dir/lib -L$pari_dir/lib ${sjlj_flags[*]} ${standalone_ldlibs[*]}" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --with-ntl="$ntl_dir" \
      --with-pari="$pari_dir" \
      --without-flint \
      --without-boost \
      --disable-shared \
      --enable-static \
      --disable-allprogs

COWASM_TOOLCHAIN=wasi-sdk make -C libsrc -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make -C libsrc install

test -f "$dist_dir/include/eclib/curve.h"
test -f "$dist_dir/lib/libec.a"

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-c++" \
  -fvisibility-main \
  -std=c++17 \
  "${sjlj_flags[@]}" \
  "$src_dir/test-eclib.cpp" \
  -I"$dist_dir/include" \
  -I"$gmp_dir/include" \
  -I"$ntl_dir/include" \
  -I"$pari_dir/include" \
  -L"$dist_dir/lib" \
  -L"$gmp_dir/lib" \
  -L"$ntl_dir/lib" \
  -L"$pari_dir/lib" \
  -lec \
  -lpari \
  -lntl \
  -lgmpxx \
  -lgmp \
  -lm \
  -lsetjmp \
  "$libcxxabi" \
  "$libunwind" \
  "${standalone_ldlibs[@]}" \
  -o "$probe_dir/eclib-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/eclib-test" |
  grep -F "eclib-ok conductor=11 torsion=5 point-arithmetic=valid"
