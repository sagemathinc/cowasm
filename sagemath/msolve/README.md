# msolve

This package builds the msolve multivariate polynomial-system solver for
CoWasm's wasi-sdk standalone target.

The standalone smoke links msolve against the existing CoWasm GMP, MPFR, and
FLINT ports. It verifies a small rational Groebner-basis computation and a
zero-dimensional real solve through the installed `msolve` executable.
