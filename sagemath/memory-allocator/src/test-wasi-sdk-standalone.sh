#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 6 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR CPYTHON_WASM PY_CYTHON POSIX_WASI_SDK" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
cpython_wasm="$(cd "$4" && pwd)"
py_cython="$(cd "$5" && pwd)"
posix_wasi_sdk="$(cd "$6" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "memory-allocator" wasi-sdk "$bin_dir" "$probe_dir"

python_include="$cpython_wasm/include/python3.14"
extension_suffix=".cpython-314-wasm32-wasi.so"
package_src="$build_dir/src/memory_allocator"

rm -rf "$dist_dir"
mkdir -p "$dist_dir/memory_allocator" "$probe_dir"

cp \
  "$package_src/__init__.py" \
  "$package_src/__init__.pxd" \
  "$package_src/memory.pxd" \
  "$package_src/memory_allocator.pxd" \
  "$package_src/signals.pxd" \
  "$dist_dir/memory_allocator/"

PYTHONPATH="$py_cython" python3 -m cython -3 \
  --output-file "$probe_dir/memory_allocator.c" \
  "$package_src/memory_allocator.pyx"

"$bin_dir/wasi-sdk-clang-next" -target wasm32-wasip1 \
  -O0 \
  -fPIC \
  -D_SCHED_H \
  -shared \
  -nostdlib \
  -Wl,--allow-undefined \
  -Wl,--no-entry \
  -Wl,--export=PyInit_memory_allocator \
  -I"$python_include" \
  -I"$package_src" \
  -I"$posix_wasi_sdk" \
  "$probe_dir/memory_allocator.c" \
  -o "$dist_dir/memory_allocator/memory_allocator$extension_suffix"

"$bin_dir/wasi-sdk-llvm-objdump-next" -h "$dist_dir/memory_allocator/memory_allocator$extension_suffix" |
  grep 'dylink\.0'
"$bin_dir/wasi-sdk-llvm-nm-next" "$dist_dir/memory_allocator/memory_allocator$extension_suffix" |
  grep ' T PyInit_memory_allocator$'

PYTHONPATH="$dist_dir:$py_cython" python3 -m cython -3 \
  --output-file "$probe_dir/test.c" \
  "$package_src/test.pyx"

"$bin_dir/wasi-sdk-clang-next" -target wasm32-wasip1 \
  -O0 \
  -fPIC \
  -D_SCHED_H \
  -shared \
  -nostdlib \
  -Wl,--allow-undefined \
  -Wl,--no-entry \
  -Wl,--export=PyInit_test \
  -I"$python_include" \
  -I"$dist_dir" \
  -I"$dist_dir/memory_allocator" \
  -I"$posix_wasi_sdk" \
  "$probe_dir/test.c" \
  -o "$dist_dir/memory_allocator/test$extension_suffix"

"$bin_dir/wasi-sdk-llvm-objdump-next" -h "$dist_dir/memory_allocator/test$extension_suffix" |
  grep 'dylink\.0'
"$bin_dir/wasi-sdk-llvm-nm-next" "$dist_dir/memory_allocator/test$extension_suffix" |
  grep ' T PyInit_test$'

PYTHONPATH="$dist_dir" "$bin_dir/python-wasm" - <<'PY'
from memory_allocator.test import TestMemoryAllocator

mem = TestMemoryAllocator()
ptr = mem.malloc(64)
assert ptr
assert mem.n() == 1

ptr = mem.realloc(ptr, 128)
assert ptr
assert mem.n() == 1

ptr = mem.calloc(8, 8)
assert ptr
ptr = mem.allocarray(8, 8)
assert ptr
ptr = mem.reallocarray(ptr, 9, 8)
assert ptr

for alignment in (1, 2, 4, 8, 16, 32, 64):
    ptr = mem.aligned_malloc(alignment, 256)
    assert ptr == ptr & ~(alignment - 1)
    ptr = mem.aligned_calloc(alignment, 3, 128)
    assert ptr == ptr & ~(alignment - 1)
    ptr = mem.aligned_allocarray(alignment, 3, 128)
    assert ptr == ptr & ~(alignment - 1)

owner = TestMemoryAllocator()
other = TestMemoryAllocator()
foreign_ptr = owner.malloc(32)
try:
    other.realloc(foreign_ptr, 64)
except ValueError as err:
    assert str(err) == "given pointer not found in MemoryAllocator"
else:
    raise AssertionError("foreign pointer realloc unexpectedly succeeded")

try:
    mem.malloc(mem.size_t_max())
except MemoryError as err:
    assert str(err).startswith("failed to allocate ")
else:
    raise AssertionError("oversized malloc unexpectedly succeeded")
PY

echo "memory-allocator-ok extension-import allocation reallocation aligned-allocation allocation-errors"
