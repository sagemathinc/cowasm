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
`NumberField.pari_zk()` path, and its real/complex embedding counts through
`nf_get_sign()`, completing `NumberField.signature()`. The initialized
number field's different is available as an owned PARI ideal through
`nf_get_diff()`, completing `NumberField.different()` construction. The narrow
conversion protocol supporting that path includes owned generic
multiplication, variable discovery and variable-specific polynomial degree,
polynomial coefficient indexing, and univariate polynomial evaluation.
The same polynomial boundary exposes `nfdisc()`, `nfisisom()`,
`nfrootsof1()`, `dirzetak()`, `nfgaloisconj()`, `nfsubfields()`, and
`nffactor()`,
completing the direct
`NumberField.discriminant()`, `NumberField.is_isomorphic()`, number-field
roots-of-unity, Dedekind-zeta coefficient, automorphism, and subfield paths
for explicit degrees without constructing a maximal order or unit group.
The factorization bridge also completes polynomial factorization over absolute
number fields and the reverse maps returned for full-degree subfields. Owned
`rnfpolredbest()` results complete the change of relative polynomial and
generator required by non-monic and non-integral relative extensions, while
owned `rnfinit()` and `rnfdisc()` results expose Sage's public relative-number-
field PARI data and relative discriminants, and scalar `rnfisfree()` completes
the public relative integral-basis freeness check.
Focused polynomial introspection now includes leading coefficient, content,
denominator, irreducibility, and recursive polynomial lifting. Together with
owned `nf_rnfeq()`, `nf_nfzk()`, `nfeltup()`, absolute-to-relative,
relative-to-absolute, and reverse coefficient-vector conversion results, this
completes construction, base-field inclusion, relative-vector-space round
trips, and recognition of extension elements that lie in the base field for
monic relative number fields. The latter path uses an owned generic PARI
`simplify()` result so variable elimination is structural rather than inferred
from display text.
Focused ideal arithmetic now also exposes owned `idealhnf()`, `idealadd()`,
`idealaddtoone()`, `idealappr()`, `idealchinese()`, `idealcoprime()`,
`idealfactor()`, `idealintersect()`, `idealinv()`, `idealismaximal()`,
`idealispower()`, `idealnumden()`, `idealmul()`, `idealdiv()`, `idealpow()`,
`ideallist()`, `idealred()`, `idealtwoelt()`, `idealval()`, and `idealnorm()`
results,
completing the adjacent
`NumberFieldFractionalIdeal.norm()`, factorization, intersection,
multiplication, quotient, inverse, direct PARI inversion,
numerator/denominator, power and power testing, equivalent-ideal reduction,
coprime ideal element and multiplier, two-generator ideal representation,
prime-ideal valuation and primality, negative uniformizers, and Chinese
remainder paths, plus bounded integral-ideal enumeration through
`NumberField.ideals_of_bdd_norm()`. Explicit PARI
`gequal()` comparison
supports the scalar-ideal fast path without routing it through conversion. The
scalar `nfeltval()` bridge also completes number-field-element valuations at
PARI prime records while preserving upstream cypari2's ordinary integer return
contract. The
standard lazy `Gen.sage()` bridge now delegates to Sage's owned PARI converter,
which restores HNF matrix comparison and converts finite and infinite ideal
valuations while retaining Sage's type-specific conversion policy. Prime-ideal
accessors plus focused `Mat`, `Col`, `matrix()`, and transpose conversions
preserve the standard Sage wrappers for factorization-based CRT, primality
caching, and ideal-approximation factor rows.
Focused BNF support preserves PARI random state and exposes owned `bnfinit()`,
`bnfisprincipal()`, `nffactorback()`, and `nfbasistoalg()` results. This is
the narrow principality chain Sage uses to print reduced generators for small
number-field ideals. The focused `nfbasistoalg_lift()` composition converts
owned basis vectors for Sage's number-field element constructor.
Certification, scalar `Gen` truth testing, and modular modulus access complete
the control and conversion path used by that display.
Focused finite-field maps support `fffrobenius`, `ffcompomap`, and `ffmap`,
which lets PARI-backed Sage finite fields cache and apply Frobenius powers
without entering the unported general cypari2 object model. A narrow Cython
`clone_ffelt` boundary also rebuilds a
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
