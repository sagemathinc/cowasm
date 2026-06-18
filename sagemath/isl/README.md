# isl For SageMath

isl is a C library for manipulating sets and relations of integer points
bounded by affine constraints. SageMath exposes it as an optional polyhedral
model dependency, and the library performs exact integer arithmetic through
GMP.

This package builds isl 0.20 for CoWasm's wasi-sdk standalone target against
the sibling `sagemath/gmp` static library. The smoke test links a WASI C probe
against `libisl.a`, counts lattice points in a constrained rectangle, applies
an affine relation, and verifies the result remains exact under the WASI
runner.
