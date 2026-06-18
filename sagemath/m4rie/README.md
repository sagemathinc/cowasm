# M4RIE

This package builds M4RIE, dense linear algebra over extension fields
`GF(2^e)`, for CoWasm's wasi-sdk standalone toolchain.

The standalone smoke builds the static M4RIE archive against the existing M4RI
port and links a C probe that checks finite-field multiplication, inversion,
matrix multiplication, and matrix addition over `GF(4)` under the WASI runner.
