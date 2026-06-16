# Sagemath Component of CoWasm

The goal of the packages in this directory is a full port of
https://www.sagemath.org/ to WebAssembly.

This is a work in progress, which starts with copying over some packages [from here](https://github.com/sagemathinc/jsage).

Current wasi-sdk standalone math smoke packages:

- GMP
- cysignals
- cddlib
- GMP-ECM
- eclib
- Givaro
- MPFR
- MPFI
- MPC
- FFLAS-FFPACK
- FLINT
- fplll
- IML
- LinBox
- lrcalc
- libbraiding
- NTL
- PARI/GP
- primesieve
- primecount
- nauty
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

**WARNING: Unlike the rest of CoWasm, there is code in this directory
that is licensed under the GPL. No code in the other packages (core, python, web, etc.,) depends on this code.**
