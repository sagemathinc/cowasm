# LinBox

LinBox is an exact linear algebra C++ library used by SageMath.

This package builds a static WASI SDK standalone LinBox baseline against the
ported GMP, Givaro, GSL, FFLAS-FFPACK, MPFR, fplll, IML, FLINT, and NTL stack.
The standalone smoke verifies LinBox's FLINT-backed integer matrix multiply
path and the NTL-backed integer ring wrapper.
