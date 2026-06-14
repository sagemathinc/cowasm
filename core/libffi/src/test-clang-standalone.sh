#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: test-clang-standalone.sh BUILD_DIR DIST_DIR BIN_DIR" >&2
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

cowasm_clang_standalone_probe "libffi" "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

cd "$build_dir"
RANLIB="$bin_dir/cowasm-ranlib" \
AR="$bin_dir/cowasm-ar" \
CC="$bin_dir/cowasm-cc" \
CFLAGS="-Oz" \
COWASM_TOOLCHAIN=clang \
  ./configure \
    --disable-docs \
    --disable-shared \
    --enable-static \
    --host=wasm32-unknown-wasi \
    --prefix="$dist_dir"

mkdir -p "$build_dir/wasm32-unknown-wasi/src/wasm32/.deps"
COWASM_TOOLCHAIN=clang make -j"$jobs"
COWASM_TOOLCHAIN=clang make install

cat >"$probe_dir/libffi-test.c" <<'EOF'
#include <ffi.h>
#include <stddef.h>

int main(void) {
  ffi_cif cif;
  ffi_type *args[2];

  args[0] = &ffi_type_sint;
  args[1] = &ffi_type_pointer;

  if (FFI_DEFAULT_ABI != FFI_WASM32) return 1;
  if (ffi_type_sint.size == 0) return 2;
  if (ffi_type_pointer.size != sizeof(void *)) return 3;
  if (ffi_prep_cif(&cif, FFI_DEFAULT_ABI, 2, &ffi_type_sint, args) != FFI_OK) {
    return 4;
  }
  if (cif.nargs != 2) return 5;
  if (cif.rtype != &ffi_type_sint) return 6;
  return 0;
}
EOF

COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-cc" \
  -fvisibility-main \
  -I"$dist_dir/include" \
  -L"$dist_dir/lib" \
  "$probe_dir/libffi-test.c" \
  -lffi \
  -o "$probe_dir/libffi-test"

cowasm_clang_standalone_run_wasi "$bin_dir" "$probe_dir/libffi-test"
