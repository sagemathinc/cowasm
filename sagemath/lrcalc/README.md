# lrcalc

This package builds the Littlewood-Richardson calculator used by SageMath for
Schubert calculus and symmetric-function computations.

The standalone smoke builds the static library and command-line tools, links a
C probe that checks Littlewood-Richardson coefficients, skew Schur terms,
fusion terms, and Schubert multiplication, and runs the installed `lrcalc` and
`schubmult` executables under the WASI runner.
