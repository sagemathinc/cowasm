# GF2X

This package builds GF2X arithmetic over `GF(2)[x]` for the CoWasm wasi-sdk
standalone toolchain. SageMath uses it directly and through NTL for polynomial
arithmetic over binary fields.

The standalone smoke builds the static `libgf2x.a` archive with hardware
specific code disabled and links a C probe that verifies ordinary and
reentrant polynomial multiplication under the WASI runner.
