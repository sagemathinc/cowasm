# Lcalc

Lcalc is SageMath's L-function calculator package.

This package builds a WASI SDK standalone baseline for the upstream
`libLfunction` library. The command-line frontend still depends on generated
`gengetopt` sources, so this first port deliberately validates the reusable
library layer directly. The standalone smoke links a C++ probe against the
installed archive and verifies Riemann zeta values, a zeta Dirichlet series,
and basic number-theory helpers through the WASI runner.
