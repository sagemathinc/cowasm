# MPFRCX

This package builds the MPFRCX multiprecision real and complex polynomial
library for CoWasm's wasi-sdk standalone target.

The standalone smoke builds against the CoWasm GMP, MPFR, and MPC ports, then
checks real polynomial multiplication, differentiation, evaluation, remainder,
linear-root extraction, complex polynomial evaluation, and complex coefficient
projection through the installed MPFRCX archive. It also reconstructs a real
polynomial from roots and verifies multipoint evaluation at those roots.
