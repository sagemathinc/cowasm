# GMP-ECM

This package builds GMP-ECM, the elliptic curve method integer factorization
library used by SageMath number-theory code.

The standalone smoke builds the static `libecm.a` archive against the existing
CoWasm GMP port with assembly, OpenMP, and resume-file locking disabled for
WASI. It links a C probe that exercises P-1 and ECM factorization paths under
the WASI runner.
