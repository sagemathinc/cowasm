# PPL

This package builds the Parma Polyhedra Library for CoWasm's pinned
wasi-sdk standalone toolchain.

The WASI smoke currently enables PPL's C++ interface and disables the
generated C, Java, OCaml, and Prolog interfaces. Those generated interfaces
need GNU m4 and additional host tools, while Sage's next CoWasm-facing step is
the C++ library that underlies `pplpy` and exact polyhedral computations.

The standalone regression links against the installed static library, solves
exact linear maximization and minimization problems, checks a GLPK-backed MIP
problem, verifies a convex-hull containment query, and reconstructs a minimized
generator system under the WASI runner.

The smoke also builds `libppl.so` as a WASI side module from the PIC PPL,
GMPXX, and GMP archives, with GLPK linked normally. It generates
`__WASM_EXPORT__...` address wrappers for PPL's global data symbols so
downstream dynamic modules such as `pplpy` can resolve shared PPL objects
through the CoWasm dylink data-symbol path.
