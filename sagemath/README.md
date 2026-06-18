# Sagemath Component of CoWasm

The goal of the packages in this directory is a full port of
https://www.sagemath.org/ to WebAssembly.

This is a work in progress, which starts with copying over some packages [from here](https://github.com/sagemathinc/jsage).

Current wasi-sdk standalone math smoke packages:

- GMP
- bliss
- cysignals
- memory_allocator
- cddlib
- GMP-ECM
- e-antic
- eclib
- Givaro
- MPFR
- MPFI
- MPC
- MPFRCX
- LiDIA
- FFLAS-FFPACK
- FLINT
- fplll
- Frobby
- IML
- LinBox
- lrcalc
- lrcalc_python
- libatomic_ops
- libbraiding
- NTL
- PARI/GP
- Lcalc
- primesieve
- primecount
- primecountpy
- Qhull (provided by `core/qhull`)
- nauty
- plantri
- Cliquer
- MCQD
- Coxeter3
- planarity
- GSL
- Boost.Cropped
- GF2X
- ratpoints
- M4RI
- M4RIE
- BRiAl
- Symmetrica
- Boehm GC
- libhomfly
- zn_poly
- rw
- PALP
- TOPCOM
- lrslib
- Gfan
- GLPK
- PPL
- 4ti2
- tdlib
- rubiks
- Tachyon
- SYMPOW
- SACLIB
- Benzene
- Buckygen
- SharedMeatAxe
- Modular decomposition
- msolve
- Sirocco
- pycosat

Current Sage pure Python/data packages with wasi-sdk standalone layout smokes:

- Combinatorial designs
- Conway polynomials
- Cunningham tables
- Cremona elliptic-curve database
- Cubic Hecke algebra database
- KnotInfo and LinkInfo database
- Jones number-field database
- Kohel modular and Hilbert polynomial database
- Symbolic polynomial-system database
- Mutation class database
- Elliptic curves
- Graph databases
- Stein-Watkins mini elliptic-curve database
- Matroid database
- PARI elldata
- PARI galdata
- PARI galpol
- PARI nftables
- PARI seadata
- PARI seadata small
- Polytopes DB
- Odlyzko zeta-zero database

Current partial Sage Python-interface packages with wasi-sdk standalone smokes:

- `pplpy` 0.9.0: the upstream Cython extension modules build and import
  against the shared `sagemath/ppl` `libppl.so` side module, and simple
  `Bit_Row` and `Variable` wrappers work under `python-wasm`. Heavier
  linear-expression, constraint, polyhedron, and MIP operations still expose a
  WebAssembly dynamic-linking function-table signature mismatch between inline
  PPL C++ constructors in the extension modules and the shared PPL side module.

Current investigated Sage optional solver gaps:

- `kissat` 3.1.0: the upstream C build can produce a WASI binary after
  disabling POSIX-only `alarm`/resident-set reporting and avoiding the host
  `tissat` test program, but the full `kissat` executable traps while parsing
  DIMACS input under the current WASI runner. Its standalone `kitten` helper
  does solve small DIMACS SAT instances, but that is not enough for a useful
  `@cowasm/kissat` package yet.
- `glucose` 4.1: the sequential `simp/glucose` build reaches link and needs
  the existing CoWasm zlib port plus the pinned wasi-sdk C++ exception
  archives. The POSIX signal/resource-limit setup must be disabled for WASI,
  and the resulting executable currently traps in the DIMACS parser under the
  current WASI runner.

Current investigated Sage Python-interface gaps:

- `pplpy` full API support: the next durable step is fixing the C++ function
  table mismatch that appears when the current partial package constructs
  constraints, polyhedra, and MIP objects through the shared PPL side module.

**WARNING: Unlike the rest of CoWasm, there is code in this directory
that is licensed under the GPL. No code in the other packages (core, python, web, etc.,) depends on this code.**
