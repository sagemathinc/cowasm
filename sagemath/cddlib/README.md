# cddlib

cddlib implements the double-description method for converting between
inequality and generator descriptions of polyhedra. SageMath uses it through
polyhedral geometry interfaces where both rational arithmetic and fast floating
arithmetic are useful.

This package builds cddlib 0.94m for CoWasm's pinned wasi-sdk standalone
toolchain. The WASI smoke compiles and runs the library in both GMP rational
and C double modes, then checks the unit square in both directions:

- inequalities to vertices through `dd_DDMatrix2Poly` and `dd_CopyGenerators`
- vertices to inequalities through `dd_DDMatrix2Poly` and `dd_CopyInequalities`
