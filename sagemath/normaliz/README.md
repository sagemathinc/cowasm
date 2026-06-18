# Normaliz for CoWasm

This package builds Normaliz as a wasi-sdk standalone library and executable
for SageMath polyhedral and affine-monoid computations.

The initial WASI smoke builds the GMP-backed core with OpenMP, FLINT, e-antic,
nauty, CoCoALib, and SCIP integration disabled. It links the final executables
at `-O0` because the current `wasm-opt` post-link step cannot parse the
exception-handling opcodes emitted by Normaliz's C++ exception paths.
