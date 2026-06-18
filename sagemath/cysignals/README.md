# cysignals

This package builds the cysignals Python extension modules used by SageMath
Cython code for interrupt and signal handling.

The standalone smoke generates the Cython sources with the existing CoWasm
Cython package, builds the `signals` and `pysignals` WASI side modules against
CoWasm CPython and `posix-wasm`, verifies their dylink exports, installs the
Sage-facing `.pxd` headers, and imports the modules with `python-wasm`. It also
checks guarded Cython code paths including `sig_retry()`, `sig_error()`,
signal-to-exception mapping, and the interrupt-safe memory allocation helpers
that downstream Sage modules cimport.
