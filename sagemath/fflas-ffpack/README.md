# FFLAS-FFPACK

FFLAS-FFPACK provides finite-field dense linear algebra routines used by
SageMath through LinBox and direct Sage library code.

This package builds a static WASI SDK standalone FFLAS-FFPACK baseline against
the existing CoWasm Givaro, GMP, and GSL ports. The standalone smoke links a
small C++ probe against the installed headers and verifies modular matrix
multiplication, rank, determinant, and linear solving over GF(17).
