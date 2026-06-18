# Lcalc

Lcalc is SageMath's L-function calculator package.

This package builds a WASI SDK standalone baseline for the upstream
`libLfunction` library, including its PARI-backed elliptic-curve path. The
command-line frontend still depends on generated `gengetopt` sources, so the
port deliberately validates the reusable library layer directly. The standalone
smoke links a C++ probe against the installed archive and verifies Riemann zeta
values, zeta and Dirichlet-character series, basic number-theory helpers, and
the 32A elliptic-curve central value through the WASI runner.
