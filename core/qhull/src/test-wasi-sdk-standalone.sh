#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
jobs="${JOBS:-8}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cat >"$probe_dir/probe.c" <<'EOF'
int main(int argc, char **argv) {
  return argc == 0 || argv == 0;
}
EOF

env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  "$probe_dir/probe.c" -o "$probe_dir/probe.wasm"
env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -c "$probe_dir/probe.c" -o "$probe_dir/probe.o"
env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-ar" \
  rc "$probe_dir/libprobe.a" "$probe_dir/probe.o"
env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-ranlib" \
  "$probe_dir/libprobe.a"

cmake_build="$build_dir/cowasm-wasi-sdk-build"

rm -rf "$dist_dir" "$cmake_build"
mkdir -p "$dist_dir" "$cmake_build" "$build_dir/bits"
echo "typedef int __jmp_buf;" >"$build_dir/bits/setjmp.h"
cat >"$build_dir/setjmp.h" <<'EOF'
#ifndef COWASM_QHULL_WASI_SDK_SETJMP_H
#define COWASM_QHULL_WASI_SDK_SETJMP_H

typedef int jmp_buf[1];

#define setjmp(env) (0)

_Noreturn void _Exit(int status);

static inline void longjmp(jmp_buf env, int status) {
  (void)env;
  _Exit(status == 0 ? 1 : status);
}

#endif
EOF

cd "$cmake_build"
COWASM_TOOLCHAIN=wasi-sdk cmake "$build_dir" \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_SYSTEM_NAME=Generic \
  -DCMAKE_TRY_COMPILE_TARGET_TYPE=STATIC_LIBRARY \
  -DCMAKE_C_COMPILER="$bin_dir/cowasm-cc" \
  -DCMAKE_CXX_COMPILER="$bin_dir/cowasm-c++" \
  -DCMAKE_C_FLAGS="-I$build_dir" \
  -DCMAKE_CXX_FLAGS="-I$build_dir" \
  -DCMAKE_AR="$bin_dir/cowasm-ar" \
  -DCMAKE_RANLIB="$bin_dir/cowasm-ranlib" \
  -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
  -DBUILD_SHARED_LIBS=OFF \
  -DBUILD_STATIC_LIBS=ON \
  -DLINK_APPS_SHARED=OFF

COWASM_TOOLCHAIN=wasi-sdk cmake --build . --target qhullstatic_r --parallel "$jobs"

mkdir -p "$dist_dir/include" "$dist_dir/lib" "$dist_dir/include/bits"
cp -R "$build_dir/src/libqhull_r" "$dist_dir/include/"
cp "$build_dir/setjmp.h" "$dist_dir/include/setjmp.h"
cp "$build_dir/bits/setjmp.h" "$dist_dir/include/bits/setjmp.h"
cp "$cmake_build/libqhullstatic_r.a" "$dist_dir/lib/libqhull_r.a"

cat >"$probe_dir/compat.c" <<'EOF'
#include <time.h>

clock_t clock(void) {
  return 0;
}
EOF

COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -c "$probe_dir/compat.c" -o "$probe_dir/compat.o"
COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-ar" \
  r "$dist_dir/lib/libqhull_r.a" "$probe_dir/compat.o"
COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-ranlib" \
  "$dist_dir/lib/libqhull_r.a"

cat >"$probe_dir/qhull-test.c" <<'EOF'
#include <stdio.h>
#include <libqhull_r/libqhull_r.h>

int main(void) {
  qhT qh_qh;
  qhT *qh = &qh_qh;
  qh_zero(qh, stderr);
  qh_freeqhull(qh, !qh_ALL);
  return 0;
}
EOF

COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -fvisibility-main \
  -I"$dist_dir/include" \
  -L"$dist_dir/lib" \
  "$probe_dir/qhull-test.c" \
  -lqhull_r \
  -o "$probe_dir/qhull-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/qhull-test"
