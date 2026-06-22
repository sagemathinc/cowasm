# CoWasm Desktop

[https://github.com/sagemathinc/cowasm\-desktop](https://github.com/sagemathinc/cowasm-desktop)

LICENSE: BSD-3-Clause. See [LICENSE](../../LICENSE).

This is a simple Electron.js \(electron\-forge\)
app that runs [Python via ﻿WebAssembly](https://cowasm.org) in a worker in node.js and does some computations and
also imports pandas and shows versions of installed libraries. That's actually fairly nontrivial.

I'm planning to test that the production binaries work on macOS and Windows. Getting this to work on Windows involved fixing some subtle issues with Python and stdin/stdout/stderr and WASI.

## Development

First install packages. This can take a while, since it will build the CoWasm dependencies, which includes WebAssembly Python and much more.

```sh
make
```

I tried to create this using the electron\-forge template \(for webpack and typescript\) and that failed horribly; I couldn't get it to work at all with WebAssembly. It forced me to use Webpack full for both the frontend and the backend via a [surprisingly sophisticated webpack plugin](https://github.com/electron/forge/tree/main/packages/plugin/webpack), and somehow this messed up the WebAssembly in a way that I couldn't fix (due to the plugin being hard to read).

Here we use WebPack only for the frontend, and not for the backend. Thus the workflow is a little different. Do all of these in separate terminals:

```sh
pnpm tsc
```

```sh
pnpm webpack
```

```sh
pnpm start
```

## Sagelite Smoke

After the Sagelite WASI package has been built, the Electron package can rerun
the Sagelite relative-resource smoke through its own `python-wasm` dependency:

```sh
pnpm test:sagelite
```

This does not launch the Electron UI. It uses the staged resources from
`sagemath/sagelite/dist/wasi-sdk/electron-resources`, reads that tree's
`sagelite-electron-resources.json` manifest, and verifies that `sage.all` exact
arithmetic and dense matrix operations work with relative `PYTHONPATH` entries.
The manifest also lists resource files that must be present for the current
smoke path, including the Sage entrypoint, `sage.env`, packaged `python.wasm`
runtime, and staged smoke script itself, so incomplete resource copies fail
before the worker starts.
It also records the expected resource kind, CPython WASI ABI, runtime platform,
and smoke contract, so stale resource bundles fail before the worker starts.
Manifest paths must be root-local POSIX-style relative paths, which keeps the
resource layout portable across Linux, macOS, and Windows Electron hosts. The
Sagelite package target also reruns the same smoke from a relocated copy of the
resources tree so absolute build-output paths do not silently become packaging
requirements.
Manifest path arrays must not contain duplicates, so generated resource
inventories cannot hide ambiguous `PYTHONPATH`, side-module, or native library
entries.
The manifest also records the audited side-module inventory and required native
library resources such as `libcxx.so`; native libraries must also appear in the
side-module inventory, so packaging validation catches missing extension modules
or side-module companion libraries before the worker starts.
Schema 7 manifests also require native libraries to be listed as required
resources with SHA-256 digests, so packaging validation rejects corrupted or
stale smoke/runtime/native files instead of only checking that the paths exist.
Schema 23 manifests also require the arithmetic, factorization, and direct
FLINT helper resources used by the exact arithmetic smoke, so missing
`factor`, `prime_pi`, or `fmpz_poly_sage` startup files fail validation before
the worker starts.
Schema 25 manifests also require the ring ideal/quotient modules and
finite-field base side modules used by the exact arithmetic smoke, so missing
`ZZ.ideal(7)` or `GF(7)` support fails validation before worker startup.
Schema 30 manifests also require the direct helper modules behind
`sage.arith.misc`, including `misc_c`, coercion, sequence, ring ABC, and
fast-arithmetic resources, so `sage.all` arithmetic cannot validate with a
partial helper set.
Schema 34 manifests include the current minimal `cypari2` PARI runtime
contract: Electron resources must contain the private Cython PARI probe side
module, and the smoke asserts that public `Pari()("...")` string expressions
can evaluate arithmetic, `primepi`, and `factorback(factor(...))` through real
PARI. The full `Gen` object model, Python conversion layer, and PARI error
translation are still later cypari2 runtime work.
Schema 36 manifests also require the Sage arithmetic helper side modules behind
the packaged exact-math smoke, including `power`, `rational_reconstruction`,
and `srange`, so partial arithmetic bundles fail validation before worker
startup.
Schema 37 manifests also require the Sage structure parent/category-object side
modules loaded by polynomial, ring, and matrix construction, so the packaged
smoke cannot validate with missing parent machinery.
Schema 38 manifests advance the cypari2 PARI smoke contract to keep the current
runtime boundary explicit: real string PARI evaluation must work, while public
non-string `Pari` inputs and `objtogen` conversion still fail closed until the
full cypari2 `Gen` object model is ported.
Schema 39 manifests reject required, `PYTHONPATH`, runtime-dependency,
side-module, and native-library entries that pass through symbolic-link path
components, so packaged resources must remain self-contained under the copied
Electron resource root.
Schema 40 manifests also reject a symbolic-link `electron-resources` root, so
an override or packaged resource directory cannot validate by redirecting the
entire Sagelite resource tree outside the copied bundle.
Schema 42 manifests extend the packaged exact-math smoke to cover
`FreeModule(ZZ, 3)` and `FreeModule(QQ, 2)` arithmetic. The manifest requires
the corresponding Sage module files and side modules as hashed resources, so a
bundle with matrix support but missing free-module arithmetic fails before
worker startup.
Schema 43 manifests extend the packaged smoke to cover Sage combinatorics
partition and permutation arithmetic. The manifest requires the corresponding
`sage.combinat` and `sage.sets` startup files and side modules as hashed
resources, so a bundle missing that combinatorics slice fails before worker
startup.
Schema 45 manifests extend that combinatorics slice to cover standard tableaux
and set partitions. The manifest requires the set-partition Python module and
Cython iterator side module as hashed resources, so a bundle missing that
enumeration path fails before worker startup.
Schema 46 manifests extend the packaged exact-math smoke to cover Sage
number-theory helpers, including CRT and integer valuations, through the
bounded Node/Electron worker path.
Schema 47 manifests extend the packaged exact-math smoke to cover Sage
integer/rational helper methods, integer quotient rings, and composite-modulus
integer-ring arithmetic through the same bounded worker path.
Schema 49 manifests extend the packaged smoke to cover finite abelian group
construction and element arithmetic. The manifest requires the Sage group
package roots, abelian group implementation files, and group side module as
hashed resources, so a bundle missing that algebra slice fails before worker
startup.
Schema 50 manifests extend that finite abelian group smoke to cover mixed-order
generator products, powers, and identity relations through the bounded
Node/Electron worker path.
Schema 53 manifests extend the packaged coding smoke to cover Hamming code
minimum-distance computation, keeping that runtime slice tied to the validated
Electron resource bundle.
Schema 60 manifests extend the packaged algebra smoke to cover free abelian
monoid construction and Cython-backed element arithmetic, so missing
`sage.monoids` startup files fail validation before worker startup.
Schema 62 manifests extend the packaged exact-helper smoke to cover
`sage.misc.flatten` and `sage.misc.functional.cyclotomic_polynomial`, so
bundles missing the functional helper modules used by common Sage-style
notation fail validation before worker startup.
Schema 63 manifests extend the packaged dense-matrix smoke to cover exact
matrix rank and echelon-form computation over `QQ`, keeping that linear
algebra slice tied to the bounded Node/Electron worker path.
Schema 66 manifests extend the packaged combinatorics smoke to cover
derangement cardinality and listing through `sage.combinat.derangements`,
keeping that finite-enumerated combinatorics slice tied to the validated
Electron resource bundle.
Schema 67 manifests extend the packaged combinatorics smoke to cover larger
derangement and subword enumeration cases through the bounded Node/Electron
worker path.
Schema 68 manifests also reject a symbolic-link
`sagelite-electron-resources.json` file, so a copied Electron resource bundle
cannot validate against manifest metadata redirected outside the bundle.
Schema 70 manifests extend the packaged combinatorics smoke to cover ordered
and unordered tuple enumeration through `sage.combinat.tuple`, so the tuple
module is part of the hashed Electron resource contract.
Schema 71 manifests require the copied side-module inventory to be sorted, so
Electron resource manifests stay deterministic and packaging validation catches
stale or hand-edited side-module lists.
Schema 72 manifests extend the packaged combinatorics smoke to cover larger
finite-set-map and tuple enumeration cases through the bounded Node/Electron
worker path.
Schema 73 manifests extend the packaged combinatorics smoke to cover partition
hook/arm/leg statistics and permutation inversion/descent/signature helpers
through the bounded Node/Electron worker path.
Schema 74 manifests extend the packaged exact-arithmetic smoke to cover
modular inverses, residue-ring division, and prime finite-field powering
through the bounded Node/Electron worker path.
Schema 75 manifests extend the packaged exact-arithmetic smoke to cover
integer and rational helper methods, including integer digit expansion,
quotient/remainder, square-root remainder, list LCM, and rational floor/ceil
operations through the bounded Node/Electron worker path.
Schema 76 manifests extend the packaged exact-arithmetic smoke to cover
additional integer helper behavior, including CRT over lists, repeated-prime
valuation, negative upper-argument binomial coefficients, and another list LCM
case through the bounded Node/Electron worker path.
Schema 77 manifests extend the packaged smoke to cover exact polynomial helper
behavior, including derivative coefficient lists, integer-polynomial
quotient/remainder, and rational-polynomial evaluation through the bounded
Node/Electron worker path.
Schema 79 manifests extend the packaged multivariate polynomial smoke to cover
bivariate degree, partial derivatives, monomial coefficients, and zero tests
through the bounded Node/Electron worker path.
Schema 90 manifests extend the packaged combinatorics smoke to cover partition
dominance and conjugation round trips plus composition descent-to-subset helper
methods through the bounded Node/Electron worker path.
Schema 91 manifests extend that combinatorics slice to cover finite
permutation enumeration plus permutation order and cycle-type helpers through
the same bounded worker path.
Schema 92 manifests extend the packaged combinatorics smoke to cover
fixed-shape standard tableaux, larger standard-tableau shape enumeration,
`SetPartitions(5)`, larger subset cardinality, and `IntegerVectors(5, 3)`
cardinality through the same bounded worker path.
Schema 94 manifests also record whether the Sagelite source checkout used to
stage the Electron resources was `clean` or `dirty`, so packaged bundles carry
source-tree-state provenance alongside the Sagelite commit hash.
Schema 100 manifests extend the packaged exact-arithmetic smoke to cover
signed integer `abs`/`sign` behavior and negative rational `abs`/floor/ceil
behavior, keeping those common Sage helper methods tied to the bounded
Node/Electron worker path.
Schema 102 manifests extend the Node and packaged Electron number-theory smoke
to cover integer `gcd` and `lcm` methods, keeping those common Sage arithmetic
methods tied to the validated resource bundle.
Schema 105 manifests extend the packaged matrix solver smoke to cover integer
`solve_left` in addition to `solve_right`, keeping both exact matrix solve
directions tied to the bounded Node/Electron worker path.
Schema 106 manifests extend the finite-field polynomial smoke to cover
quotient/remainder, coefficient lists, and powers over `GF(7)`, keeping that
exact algebra path tied to the bounded Node/Electron worker path.
Schema 108 manifests extend the matrix solver smoke to cover rational
`solve_left` in addition to rational `solve_right`, keeping both exact solve
directions tied to the bounded Node/Electron worker path.
Schema 109 manifests extend the integer/rational helper smoke to cover modular
integer inverse, negative integer quotient/remainder, integer-argument
`powermod`, and rational multiplication/division through the same bounded
worker path.
Schema 110 manifests extend the matrix smoke to cover integer matrix powers,
vertical stacking, and horizontal augmentation through the bounded
Node/Electron worker path.

The Electron main process also consumes that same manifest when launching the
interactive Python worker. During development it looks for
`../../sagemath/sagelite/dist/wasi-sdk/electron-resources` from the compiled
main-process files. In packaged builds, Electron Forge copies that directory as
an extra resource and the app resolves it from `process.resourcesPath`.

Set `COWASM_SAGELITE_ELECTRON_RESOURCES=/path/to/electron-resources` to test a
different staged Sagelite resource tree without rebuilding the app. Electron
Forge and the Electron runtime treat that override as authoritative: missing
resources or a missing manifest fail instead of falling back to another
resource tree. Forge also honors that variable when packaging, validates the
manifest before adding the resource directory, normalizes the copied resource
directory to `electron-resources`, and revalidates the final packaged bundle so
incomplete copies fail during packaging. Set
`COWASM_REQUIRE_SAGELITE_ELECTRON_RESOURCES=1` when packaging release builds so
missing Sagelite resources fail the package step instead of producing a base
Python-only app.

To validate the Electron manifest parser and relative-path checks without
building Sagelite or launching Electron, run:

```sh
make test-sagelite-manifest
```
