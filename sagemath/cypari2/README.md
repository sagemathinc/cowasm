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
PARI operations.

The standalone target now also builds private
`cypari2._pari_runtime_probe` and `cypari2._pari_cython_probe` side modules
that link the CoWasm `libpari.a`, `libgmp.a`, and static `libsetjmp.a`. These
probes prove the first runtime ABI gates: PARI calls can execute inside Python
extension side modules, Cython-generated code can call PARI through cypari2's
generated `.pxd` declarations, PARI can catch an `e_INV` error from `1/0`, and
a later computation in the same Python process still works. The full public
`cypari2` runtime modules still need a dedicated follow-up port that connects
this proven PARI/SJLJ boundary to cypari2's Cython `Gen`, `Pari`, conversion,
stack, and error-translation modules.

Run the current probe with:

```sh
make -C sagemath/cypari2 test-wasi-sdk-standalone
```
