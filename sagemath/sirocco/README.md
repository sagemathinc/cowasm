# Sirocco

This package builds Sirocco, SageMath's optional library for topologically
certified root continuation of bivariate polynomials, for the CoWasm wasi-sdk
standalone toolchain.

The smoke test builds the static Sirocco library against the existing CoWasm
GMP and MPFR ports, installs its headers and `libsirocco.a`, and runs both the
double-precision and MPFR-backed homotopy APIs under the standalone WASI runner.
