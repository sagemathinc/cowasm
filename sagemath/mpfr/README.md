# MPFR

This package builds GNU MPFR, multiple-precision floating-point arithmetic with
correct rounding, for CoWasm's wasi-sdk standalone toolchain.

The standalone smoke builds the static MPFR archive against the existing GMP
port with thread-safe support disabled. The archive is compiled with `-fPIC`
because Sagelite links MPFR into CPython side modules under the Node.js/Electron
runtime path. The smoke links both a C executable probe and a minimal
shared-object probe. The executable checks constants, elementary functions,
directed rounding, flags, MPZ conversion, special functions, nextafter, fused
multiply-add, root extraction, and trigonometric special values under the WASI
runner.
