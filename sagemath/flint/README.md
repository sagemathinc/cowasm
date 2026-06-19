# FLINT

This package builds FLINT, SageMath's core number-theory and exact algebra
library, for CoWasm's wasi-sdk standalone toolchain.

The standalone smoke builds the static FLINT archive against the existing GMP
and MPFR ports with threading and assembly disabled. The archive is compiled
with `-fPIC` because Sagelite links FLINT into CPython side modules under the
Node.js/Electron runtime path. The smoke links both a broad C executable probe
and a minimal shared-object probe, covering integers, rationals, finite fields,
polynomial arithmetic,
factorization, arithmetic/combinatorics functions, matrices, normal forms,
Arb/ACB ball arithmetic, QQbar, and Calcium APIs under the WASI runner. The
arithmetic checks cover partitions, harmonic numbers, Bell numbers, Stirling
numbers, Euler numbers, and sums of squares. The finite-field checks cover
GF(9) exponentiation together with Frobenius, trace, norm, and
multiplicative-order operations used by Sage finite-field code. The Arb/ACB
checks include special function identities for zeta, Lambert W, complex
exp/log inversion, and trigonometric evaluation on the imaginary axis.
