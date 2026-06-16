# Sagemath Component of CoWasm

The goal of the packages in this directory is a full port of
https://www.sagemath.org/ to WebAssembly.

This is a work in progress, which starts with copying over some packages [from here](https://github.com/sagemathinc/jsage).

Current wasi-sdk standalone math smoke packages:

- GMP
- cddlib
- GMP-ECM
- Givaro
- MPFR
- MPFI
- MPC
- FFLAS-FFPACK
- FLINT
- IML
- LinBox
- NTL
- PARI/GP
- GSL
- ratpoints

**WARNING: Unlike the rest of CoWasm, there is code in this directory
that is licensed under the GPL. No code in the other packages (core, python, web, etc.,) depends on this code.**
