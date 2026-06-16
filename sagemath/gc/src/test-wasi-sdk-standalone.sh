#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR LIBATOMIC_OPS_WASI_SDK" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
libatomic_ops_dir="$(cd "$4" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "gc" wasi-sdk "$bin_dir" "$probe_dir"

jobs="${MAKEFLAGS:-}"
jobs="${jobs##*-j}"
if ! [[ "$jobs" =~ ^[0-9]+$ ]]; then
  jobs=4
fi

rm -rf "$dist_dir"

cd "$build_dir"
compat_dir="$build_dir/cowasm-wasi-compat"
mkdir -p "$compat_dir/bits"
printf 'typedef int __jmp_buf;\n' >"$compat_dir/bits/setjmp.h"
cat >"$compat_dir/setjmp.h" <<'EOF'
#ifndef COWASM_GC_WASI_SETJMP_H
#define COWASM_GC_WASI_SETJMP_H
#include <stdlib.h>
typedef int jmp_buf[1];
#define setjmp(env) (0)
static inline void longjmp(jmp_buf env, int status) __attribute__((noreturn));
static inline void longjmp(jmp_buf env, int status) {
  (void)env;
  (void)status;
  abort();
}
#endif
EOF

env \
  AR="$bin_dir/cowasm-ar" \
  RANLIB="$bin_dir/cowasm-ranlib" \
  CC="$bin_dir/cowasm-cc" \
  CPPFLAGS="-I$compat_dir -I$libatomic_ops_dir/include" \
  CFLAGS="-Oz -fvisibility-main -DNO_DEBUGGING" \
  LDFLAGS="-L$libatomic_ops_dir/lib" \
  COWASM_TOOLCHAIN=wasi-sdk \
    ./configure \
      --build=i686-pc-linux-gnu \
      --host=none \
      --prefix="$dist_dir" \
      --disable-shared \
      --enable-static \
      --enable-threads=none \
      --disable-threads-discovery \
      --disable-dependency-tracking \
      --with-libatomic-ops=yes

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make install

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -Oz \
  "$src_dir/test-gc.c" \
  -I"$compat_dir" \
  -I"$dist_dir/include" \
  -I"$libatomic_ops_dir/include" \
  -L"$dist_dir/lib" \
  -L"$libatomic_ops_dir/lib" \
  -lgc \
  -latomic_ops \
  -lwasi-emulated-process-clocks \
  -o "$probe_dir/gc-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/gc-test" |
  grep "gc-ok sum=528 atomic=wasi-gc finalizer=17"
