# M4RI

This package builds M4RI, dense linear algebra over `GF(2)`, for CoWasm's
wasi-sdk standalone toolchain.

The standalone smoke builds the static `libm4ri.a` archive with SSE2 and PNG
support disabled for WASI. It links a C probe that verifies matrix rank,
multiplication, left solve, left kernel, and inversion operations under the
WASI runner.
