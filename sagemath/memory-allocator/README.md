# Memory Allocator For SageMath

This package provides SageMath's standard `memory_allocator` Cython extension
for CoWasm.

The WASI SDK standalone smoke builds the upstream `memory_allocator` extension
and its Cython test extension as CPython side modules. It verifies the modules
import under `python-wasm`, then exercises malloc/calloc, array allocation,
reallocation, aligned allocation, and the expected error path for reallocating
a pointer owned by a different allocator.
