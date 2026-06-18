# LiDIA for CoWasm

This package builds LiDIA as a static wasi-sdk library for SageMath. Sage uses
LiDIA on the dependency path for LattE integrale, and this port uses the Sage
tarball patched for that integration.

The standalone smoke test links against the sibling `sagemath/gmp` wasi-sdk
build. It checks integer arithmetic, primality helpers, rational arithmetic,
modular arithmetic, and a small matrix determinant.

LiDIA uses a custom license owned by the LiDIA-Group: it allows free copying,
modification, and redistribution for non-commercial purposes, requires the
copyright notice to be preserved, and disallows proprietary modifications.
