# LinBox

LinBox is an exact linear algebra C++ library used by SageMath.

This package builds a static WASI SDK standalone LinBox baseline against the
ported GMP, Givaro, GSL, FFLAS-FFPACK, MPFR, fplll, IML, and FLINT stack. The
standalone smoke verifies LinBox's FLINT-backed integer matrix multiply path.
Optional LinBox integrations such as NTL remain disabled so the required
dependency path stays explicit and independently testable.
