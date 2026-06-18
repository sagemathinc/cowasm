# fplll

This package builds the fplll lattice reduction library for SageMath with the
wasi-sdk standalone toolchain against the existing CoWasm GMP and MPFR ports.

The standalone smoke links a small C++ probe against `libfplll.a` and checks
the lattice APIs Sage depends on directly: LLL reduction, reduced-basis
verification, proved SVP enumeration, and proved CVP enumeration.
