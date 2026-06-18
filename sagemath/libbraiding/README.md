# libbraiding

This package builds libbraiding, SageMath's braid-group computation library,
for CoWasm's wasi-sdk standalone toolchain.

The standalone smoke builds the static library and links a C++ probe that
checks Artin braid construction, left canonical form data, left normal forms,
and conjugacy computation under the WASI runner.
