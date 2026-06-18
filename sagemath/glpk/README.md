# GLPK

This package builds the GNU Linear Programming Kit for CoWasm's wasi-sdk
standalone toolchain. SageMath uses GLPK for linear and mixed-integer
optimization, and PPL can use the installed GLPK port for MIP checks.

The standalone smoke verifies that the pinned wasi-sdk setjmp support is
available, builds the static GLPK archive against GMP, and links a C probe that
checks simplex, exact LP, integer optimization, and graph routines under the
WASI runner.
