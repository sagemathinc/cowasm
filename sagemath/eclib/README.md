# eclib

eclib is John Cremona's elliptic-curve library. SageMath uses it for
elliptic-curve arithmetic, including curve reduction, conductors, torsion
subgroups, Mordell-Weil computations, and descent-related routines.

This package builds the upstream static `libec.a` archive for the wasi-sdk
standalone target against the existing CoWasm GMP, MPFR, FLINT, NTL, and PARI
ports. The standalone smoke test verifies that the installed headers and
archive link into a WASI executable, then checks an elliptic curve conductor,
torsion order, point addition, and scalar multiplication under the WASI runner.

The current target disables eclib's command-line programs and builds the
library interface used by SageMath.
