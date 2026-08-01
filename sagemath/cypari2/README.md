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

It is not yet the full `cypari2` runtime port. The placeholder `Gen` object
and most conversion entry points intentionally fail closed for real PARI
operations. The public `Pari()("...")` path now supports a small string-input
runtime slice backed by the private Cython PARI probe. The focused `Gen`
runtime also exposes the PARI integer operations needed by Sagelite's current
pure-integer doctest slice, including factorization, `nextprime`, `znorder`,
`ispseudoprime`, `isprimepower`, and `ispseudoprimepower`.
Exact rational-like Python and Sage values can also cross the focused
`objtogen` boundary. Sage extension types whose available `__pari__()` hook
returns a real `Gen` can use the same boundary without falling back to lossy
string conversion; hooks requiring converter modules outside the focused
profile retain the explicit `NotImplementedError` fallback contract. Sage's
dedicated PARI-to-rational converter also remains discoverable when converting
a `Gen` back to `QQ`. The focused polynomial-vector conversion honors the
requested `Polrev(name)` variable, preserving named generators when Sage
constructs PARI-backed finite fields. The same polynomial surface exposes the
main variable, generic division, and modular reversal needed for Sage's
absolute number-field structure maps. It can also clone a polynomial or power
series with a requested PARI variable name, which completes Sage's
`NumberField.pari_polynomial(name)` path. The same focused surface now
supports polynomial degree, scalar comparisons, vector slicing, integral
basis construction, and number-field initialization, completing the first
`NumberField.pari_nf()` prefix doctest. It also exposes the initialized
number field's integral basis through `nf_get_zk()`, completing the focused
`NumberField.pari_zk()` path. Focused finite-field maps support
`fffrobenius`, `ffcompomap`, and `ffmap`, which lets PARI-backed Sage finite
fields cache and apply Frobenius powers without entering the unported general
cypari2 object model. A narrow Cython `clone_ffelt` boundary also rebuilds a
Sage-owned finite-field element against cypari2's owned field generator before
wrapping it. This keeps temporary Sage coefficients from leaving dangling or
mixed-field PARI objects when polynomials cross split WASM side modules.

The standalone target now also builds private
`cypari2._pari_runtime_probe` and `cypari2._pari_cython_probe` side modules
that link the CoWasm `libpari.a`, `libgmp.a`, and static `libsetjmp.a`. These
probes prove the first runtime ABI gates: PARI calls can execute inside Python
extension side modules, Cython-generated code can call PARI through cypari2's
generated `.pxd` declarations, PARI can catch an `e_INV` error from `1/0`, and
a later computation in the same Python process still works. The minimal public
`Pari` wrapper uses this boundary for string expressions such as `2+3`,
`primepi(10000)`, and `factorback(factor(360))`. The full public `cypari2`
runtime modules still need a dedicated follow-up port that connects this
proven PARI/SJLJ boundary to cypari2's Cython `Gen`, conversion, stack, and
error-translation modules.

Run the current probe with:

```sh
make -C sagemath/cypari2 test-wasi-sdk-standalone
```
