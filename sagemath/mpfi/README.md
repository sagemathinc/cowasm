# MPFI

This package builds MPFI, multiple-precision interval arithmetic over MPFR, for
CoWasm's wasi-sdk standalone toolchain.

The standalone smoke builds the static MPFI archive against the existing GMP
and MPFR ports. It links a C probe that checks interval arithmetic,
intersection, hull, bisection, constants, trigonometric functions, logarithms,
and exponentials under the WASI runner.
