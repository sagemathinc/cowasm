# sympow

SYMPOW computes special values of symmetric-power elliptic-curve
L-functions. SageMath uses it for elliptic-curve analytic computations such as
symmetric powers, modular degrees, and analytic ranks.

This package builds the upstream `sympow` executable for the wasi-sdk
standalone target. The current WASI baseline disables runtime PARI/GP mesh
generation because WASI has no `fork`/`exec` process model, but it verifies the
compiled arithmetic paths with version/endian checks, a local Euler-factor
query, and a root-number computation under the WASI runner.
