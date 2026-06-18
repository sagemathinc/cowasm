# Bliss

This package builds the bliss graph automorphism and canonical labeling library
used by SageMath for CoWasm's wasi-sdk standalone target.

The port builds a static `libbliss.a`, installs the upstream C and C++ headers
under `include/bliss`, and builds the upstream `bliss` command-line program as a
WASI executable.

The standalone smoke test compiles the library sources with the pinned wasi-sdk
C++ toolchain, links a small C API probe, and verifies canonical labeling for two
isomorphic 4-cycles. It also runs the installed `bliss` executable on a DIMACS
4-cycle, checks the expected automorphism generators and canonical labeling, and
checks the upstream version string.
