# zn_poly

This package builds zn_poly, arithmetic for dense polynomials over
`Z/nZ[x]`, for CoWasm's wasi-sdk standalone toolchain.

The standalone smoke builds the static archive against the existing GMP port
with tuning disabled. It links a C probe that checks polynomial product,
square, middle product, scalar multiplication, subtraction, negation, copying,
zeroing, modular inverse, and modular powering under the WASI runner.
