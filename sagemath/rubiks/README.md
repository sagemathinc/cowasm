# Rubiks

This package builds the Rubik's cube solver collection packaged by SageMath for
CoWasm's wasi-sdk standalone target.

The standalone smoke downloads the Sage tarball, builds the Dietz `cu2`,
`cubex`, and `mcube` C++ solvers, builds the Dik `dikcube` and `size222` C
programs, and builds Michael Reid's `optimal` and `twist` C programs. It then
runs small deterministic WASI checks through the CoWasm runner for `cu2`,
`cubex`, `mcube`, `dikcube`, `size222`, `twist`, and `optimal`.

`optimal` generates large search tables at startup, so the smoke only checks a
solved cube after initialization. The binary is linked with a larger WASI stack
because Reid's table setup uses sizeable automatic arrays.

The port uses local compatibility headers for the older K&R-style C sources and
for the small signal/setjmp surface expected by Reid's solver.
