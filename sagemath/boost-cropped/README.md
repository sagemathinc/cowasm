# boost-cropped

This package provides SageMath's cropped, header-only Boost subset for CoWasm's
wasi-sdk standalone toolchain. Several Sage C++ libraries use this older Boost
API surface instead of the full Boost distribution.

The standalone smoke installs the `boost/` headers and compiles a C++ probe
against them. It checks representative dynamic bitset, intrusive pointer,
multiprecision integer, rational, graph, hash, scoped array, and preprocessor
headers under the WASI runner.
