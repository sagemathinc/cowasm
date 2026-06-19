# Memory Allocator For SageMath

This package provides SageMath's standard `memory_allocator` Cython extension
for CoWasm.

The WASI SDK standalone smoke builds the upstream `memory_allocator` extension
and its Cython test extension as CPython side modules. It verifies the modules
import under `python-wasm`, then exercises malloc/calloc, array allocation,
NULL and ordinary reallocation, allocator table growth, aligned allocation, and
the expected error paths for oversized allocations and reallocating a pointer
owned by a different allocator.

The package-level `memory_allocator` module also exports `MemoryAllocator`,
matching Sagelite's runtime import expectation.
