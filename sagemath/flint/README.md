# FLINT

This package builds FLINT, SageMath's core number-theory and exact algebra
library, for CoWasm's wasi-sdk standalone toolchain.

The standalone smoke builds the static FLINT archive against the existing GMP
and MPFR ports with threading and assembly disabled. It links a broad C probe
covering integers, rationals, finite fields, polynomial arithmetic,
factorization, matrices, normal forms, Arb/ACB ball arithmetic, QQbar, and
Calcium APIs under the WASI runner.
