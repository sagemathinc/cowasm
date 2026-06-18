# pplpy

pplpy is SageMath's Python wrapper for the Parma Polyhedra Library.

This package builds the upstream Cython modules as CPython 3.14 WASI side
modules. Each module links against the `sagemath/ppl` `libppl.so` side module
instead of embedding `libppl.a`, so the package exercises the intended shared
PPL-object layout for downstream `pplpy` work.

The current standalone smoke is intentionally narrow: it imports the public
`ppl` package under `python-wasm` and checks the modules, `Bit_Row` operations,
`Variable`, and `Linear_Expression` construction/mutation. Constraint,
generator, polyhedron, and MIP operations still expose a WebAssembly
dynamic-linking function-table signature mismatch between inline PPL C++
constructors in the extension modules and the shared `libppl.so` side module.
