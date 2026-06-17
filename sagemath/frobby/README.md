# Frobby for CoWasm

This package builds Frobby as a wasi-sdk standalone executable for SageMath
monomial-ideal computations.

The smoke test links against the sibling `sagemath/gmp` wasi-sdk build and the
pinned exception-enabled wasi-sdk C++ runtime archives. It checks startup help
output and an irreducible-decomposition computation on a small monomial ideal.
