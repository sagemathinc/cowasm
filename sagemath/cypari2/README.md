# cypari2

This package is the CoWasm build-support boundary for Sagelite's `cypari2`
dependency.

The current `wasi-sdk` target installs the pinned `cypari2` 2.2.4 Cython
include surface and generated PARI declarations from CoWasm's PARI data. This
is enough for Sagelite's Meson configure step to locate `cypari2` and for
Cython to resolve the `.pxd` files used by Sage modules.

It is not yet the full `cypari2` runtime port. The compiled `cypari2` extension
modules still need a dedicated follow-up port that links PARI, GMP, and
cysignals with the side-module SJLJ/error-handling contract.

Run the current probe with:

```sh
make -C sagemath/cypari2 test-wasi-sdk-standalone
```
