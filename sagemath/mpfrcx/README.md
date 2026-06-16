# MPFRCX

This package builds the MPFRCX multiprecision real and complex polynomial
library for CoWasm's wasi-sdk standalone target.

The standalone smoke builds against the CoWasm GMP, MPFR, and MPC ports, then
checks real polynomial multiplication, differentiation, evaluation, and complex
polynomial evaluation through the installed MPFRCX archive.
