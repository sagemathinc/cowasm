# LinBox

LinBox is an exact linear algebra C++ library used by SageMath.

This package builds a static WASI SDK standalone LinBox baseline against the
ported GMP, Givaro, GSL, and FFLAS-FFPACK stack. Optional LinBox integrations
such as NTL, MPFR, IML, and FLINT are intentionally disabled in this first port
so the required dependency path stays explicit and independently testable.
