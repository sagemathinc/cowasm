# libhomfly

This package builds libhomfly, SageMath's HOMFLY polynomial library for knot
computations, for CoWasm's wasi-sdk standalone toolchain.

The standalone smoke builds the static library against the existing Boehm GC
port and links a C probe that computes a trefoil HOMFLY polynomial in both
string and structured polynomial forms under the WASI runner.
