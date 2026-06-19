# cypari2

This package is the CoWasm build-support boundary for Sagelite's `cypari2`
dependency.

The current `wasi-sdk` target installs the pinned `cypari2` 2.2.4 Cython
include surface and generated PARI declarations from CoWasm's PARI data. It
also builds a minimal `cypari2.gen` WASI side module whose `Gen_base` and `Gen`
extension types match the installed `.pxd` layout. This is enough for
Sagelite's Meson configure step to locate `cypari2`, for Cython to resolve the
`.pxd` files used by Sage modules, and for Sagelite modules that cimport
`cypari2.gen` to pass their import-time Cython type checks.

It is not yet the full `cypari2` runtime port. The placeholder `Gen` object,
`Pari` object, and conversion entry points intentionally fail closed for real
PARI operations. The full compiled runtime modules still need a dedicated
follow-up port that links PARI, GMP, and cysignals with the side-module
SJLJ/error-handling contract.

Run the current probe with:

```sh
make -C sagemath/cypari2 test-wasi-sdk-standalone
```
