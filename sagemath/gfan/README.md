# Gfan

Gfan computes Groebner fans and tropical varieties. SageMath uses it for
polyhedral and tropical computations around polynomial ideals.

This package builds a wasi-sdk standalone `gfan` binary against the existing
CoWasm GMP and cddlib ports. The smoke test runs `_list` to verify command
dispatch and `_buchberger` on a small polynomial system to check that the
ported executable can do a real Groebner-basis computation under the WASI
runner.
