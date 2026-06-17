# Rubiks

This package builds the Rubik's cube solver collection packaged by SageMath for
CoWasm's wasi-sdk standalone target.

The standalone smoke downloads the Sage tarball, builds the Dietz `cu2`,
`cubex`, and `mcube` C++ solvers, builds the Dik `dikcube` and `size222` C
programs, and builds Michael Reid's `optimal` and `twist` C programs. It then
runs small deterministic WASI checks through the CoWasm runner for `cu2`,
`cubex`, `dikcube`, `size222`, and `twist`.

`optimal` is compiled but not executed by the smoke test because its upstream
startup path generates large search tables and is intentionally too slow for a
routine package validation. Keeping it in the build still catches the WASI C
compatibility issues needed by Sage's packaged solver set.

The port uses local compatibility headers for the older K&R-style C sources and
for the small signal/setjmp surface expected by Reid's solver.
