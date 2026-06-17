# lrslib

lrslib implements reverse-search algorithms for vertex enumeration, convex
hulls, and Nash equilibria. SageMath uses it in polyhedral geometry and game
theory workflows.

This package builds wasi-sdk standalone `lrs` and `lrsnash` binaries plus the
static `liblrs.a` archive against the existing CoWasm GMP port. The smoke test
checks cube vertex enumeration, rational volume computation, a small Nash
equilibrium example, and a static-library link probe through `lpdemo`.
