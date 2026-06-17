# Sagemath Component of CoWasm

The goal of the packages in this directory is a full port of
https://www.sagemath.org/ to WebAssembly.

This is a work in progress, which starts with copying over some packages [from here](https://github.com/sagemathinc/jsage).

Current wasi-sdk standalone math smoke packages:

- GMP
- bliss
- cysignals
- cddlib
- GMP-ECM
- eclib
- Givaro
- MPFR
- MPFI
- MPC
- MPFRCX
- FFLAS-FFPACK
- FLINT
- fplll
- IML
- LinBox
- lrcalc
- libatomic_ops
- libbraiding
- NTL
- PARI/GP
- Lcalc
- primesieve
- primecount
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
- 4ti2
- tdlib
- rubiks
- Tachyon
- SYMPOW
- SACLIB

Current Sage pure Python/data packages with wasi-sdk standalone layout smokes:

- Conway polynomials
- Elliptic curves
- Graph databases
- PARI elldata
- PARI galdata
- PARI seadata small
- Polytopes DB

**WARNING: Unlike the rest of CoWasm, there is code in this directory
that is licensed under the GPL. No code in the other packages (core, python, web, etc.,) depends on this code.**
