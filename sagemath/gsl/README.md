# GSL

This package builds the GNU Scientific Library for CoWasm's wasi-sdk standalone
toolchain. SageMath uses GSL for numerical routines such as linear algebra,
statistics, integration, optimization, and special functions.

The standalone smoke builds the static GSL archive and links a C probe that
checks representative BLAS, CDF, eigenvalue, integration, linear algebra,
minimization, polynomial, root-finding, sorting, statistics, vector, and Bessel
function APIs under the WASI runner.
