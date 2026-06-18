# PPL

This package builds the Parma Polyhedra Library for CoWasm's pinned
wasi-sdk standalone toolchain.

The WASI smoke currently enables PPL's C++ interface and disables the
generated C, Java, OCaml, and Prolog interfaces. Those generated interfaces
need GNU m4 and additional host tools, while Sage's next CoWasm-facing step is
the C++ library that underlies `pplpy` and exact polyhedral computations.
