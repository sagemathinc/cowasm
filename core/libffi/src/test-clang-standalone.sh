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

static int add_words(int left, int right) {
  return left + right;
}

static int is_null_pointer(void *ptr) {
  return ptr == NULL ? 37 : -1;
}

static void write_word(int *target, int value) {
  *target = value;
}

int main(void) {
  ffi_cif cif;
  ffi_type *args[2];
  void *values[2];
  int left;
  int right;
  int result;
  void *ptr;
  int target;

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

  args[0] = &ffi_type_sint;
  args[1] = &ffi_type_sint;
  left = 12;
  right = 30;
  values[0] = &left;
  values[1] = &right;
  result = 0;
  if (ffi_prep_cif(&cif, FFI_DEFAULT_ABI, 2, &ffi_type_sint, args) != FFI_OK) {
    return 7;
  }
  ffi_call(&cif, (ffi_fp)add_words, &result, values);
  if (result != 42) return 8;

  args[0] = &ffi_type_pointer;
  ptr = NULL;
  values[0] = &ptr;
  result = 0;
  if (ffi_prep_cif(&cif, FFI_DEFAULT_ABI, 1, &ffi_type_sint, args) != FFI_OK) {
    return 9;
  }
  ffi_call(&cif, (ffi_fp)is_null_pointer, &result, values);
  if (result != 37) return 10;

  args[0] = &ffi_type_pointer;
  args[1] = &ffi_type_sint;
  target = 0;
  ptr = &target;
  right = 391;
  values[0] = &ptr;
  values[1] = &right;
  if (ffi_prep_cif(&cif, FFI_DEFAULT_ABI, 2, &ffi_type_void, args) != FFI_OK) {
    return 11;
  }
  ffi_call(&cif, (ffi_fp)write_word, NULL, values);
  if (target != 391) return 12;

  args[0] = &ffi_type_double;
  if (ffi_prep_cif(&cif, FFI_DEFAULT_ABI, 1, &ffi_type_sint, args) !=
      FFI_BAD_TYPEDEF) {
    return 13;
  }

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
