# Givaro

This package builds Givaro, a C++ arithmetic and algebra library used by
SageMath linear algebra and exact algebra packages.

The standalone smoke builds the static Givaro archive against the existing GMP
port and links a C++ probe that checks big integers, rationals, modular
arithmetic, and finite-field matrix operations under the WASI runner.
