# NTL

This package builds NTL, Victor Shoup's C++ number theory library, for
CoWasm's wasi-sdk standalone toolchain.

The standalone smoke builds the static NTL archive against the existing GMP
and GF2X ports with native tuning and threads disabled. It links a C++ probe
that checks lattice reduction, integer and modular polynomial arithmetic,
finite-field factorization, and GF2X-backed binary polynomial functionality
under the WASI runner.
