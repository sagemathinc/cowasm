# Sagelite

This package is the controlled CoWasm build probe for the local Sagelite
checkout at `/home/user/sagelite`.

The first milestone is Node.js/Electron support: `python-wasm` should import
Sagelite-built modules and run a small exact-math smoke from the normal CoWasm
workspace layout. Browser support is deliberately out of scope for this package
target until the Node runtime path works.

Run the current probe with:

```sh
make -C sagemath/sagelite test-wasi-sdk-standalone
```

The target stages the Sagelite checkout into `build/wasi-sdk`, prepares explicit
CoWasm Python, Cython, NumPy, gmpy2, cysignals, memory_allocator, primecountpy,
Meson, Ninja, compiler, and pkg-config paths, and then runs direct `meson
setup`. It does not use build isolation and does not run `pip install
sagelite`.

## Current Status

The package boundary now exists, includes package-local host Meson and Ninja
drivers, uses a package-local `pkg-config` shim for WASI `.pc` discovery, wires
in the `cypari2` build-support include surface, includes the pure Python
`platformdirs` runtime package needed by `sage.env`, and records the first
configure, compile, install, or Node.js import blocker in
`dist/wasi-sdk/status.txt`.

The current `cypari2` package is still build-support only for real PARI
operations: it provides the package marker, Cython declarations, and a minimal
ABI-compatible `cypari2.gen` side-module placeholder needed by Sagelite's
configure/Cython phases and import-time type checks.

The current probe uses CPython's `dist/wasi-sdk` header/runtime surface via
`python-wasi-sdk`, so it no longer needs to hide system scheduler declarations
with `_SCHED_H`.  It also preincludes a small fenv compatibility header, enables
WASI emulated signal declarations for sources that include `<signal.h>`, drops
Meson's unsupported GNU archive group markers in a probe-local compiler wrapper,
and globally exposes the CoWasm Boost, GSL, MPFR, MPFI, and NTL include surfaces
for Sagelite extension targets that do not inherit all required Meson
dependencies.

With the matching LinBox `BlockHankel` accessor patch applied,
`platformdirs` available on the runtime `PYTHONPATH`, and the Sagelite integer
and rational ring initialization deferred until their parent singletons exist,
the standalone probe gets through Meson configure, compile, install, `import
sage`, `import sage.env`, `import sage.structure.element`, a basic
`ZZ(2) + ZZ(3)` Node.js integer arithmetic smoke, and a basic
`QQ(2) / QQ(5) + QQ(1) / QQ(5)` rational arithmetic smoke. The Node.js
`python-wasm` import ladder requires a per-step completion marker so a clean
process exit is not mistaken for a completed import or math check.

The WASI patch now lazy-loads the `sage.libs` NTL, PARI, and Symmetrica
aggregates from `sage.libs.all`; this avoids optional C/C++ library startup
paths turning `import sage.all` into a clean process exit before the current
runtime has stable NTL and full `cypari2` extension support. It also skips
eager Givaro and NTL finite-field backend imports on WASI so the finite-field
constructor can import without initializing those side modules, and disables
Sagelite's optional startup-output silencing on WASI so it does not call through
`ctypes.CDLL(None).fflush(NULL)` during `sage.all` import.

The WASI patch also keeps p-adic constructors lazy during `sage.rings.all`
startup and uses a lightweight p-adic leaf-class stub in the polynomial ring
constructor. This lets polynomial ring startup proceed without initializing the
current p-adic side modules, while preserving explicit p-adic imports as a
separate runtime follow-up.

The WASI `sage.all` startup path is now intentionally exact-arithmetic-focused:
symbolic, plotting, algebra-system, and broad optional families stay out of
startup until their side modules are ready. It exposes `prime_pi` through the
existing CoWasm `primecountpy` package and lazy-loads interval, complex,
imaginary-unit, and host-signal helpers that previously caused clean exits or
normal import failures during `sage.all`.

The local libffi wasm32 backend now has a constrained raw `ffi_call`
implementation for direct word-sized `int`, 8/16/32-bit integer, pointer, and
`void` signatures with up to eight arguments. This is enough for standalone
WASI `ffi_call` smoke tests, but calls through imported/main-module function
pointers still need more dynamic-loader/runtime work.

Sagelite side modules intentionally do not link `libwasi-emulated-signal`.
Keeping those signal references unresolved lets the CoWasm dynamic loader bind
them from the Python host and prevents extension modules from recording
`libwasi-emulated-signal.so` as a `needed_dynlibs` entry that the Node.js loader
would search for next to every extension.

After install, the standalone target audits every installed Sagelite extension
module before starting the Node.js import ladder. The audit requires a
`dylink.0` section, a `PyInit_*` export, imported WASM memory, and no
`needed_dynlibs` metadata. This turns the milestone's side-module ABI contract
into a package-wide gate instead of checking only one representative extension.

The Node.js runtime probe now completes the first exact-math smoke from
`sage.all`: integer arithmetic, integer ideals, modular integer rings, prime
finite fields, two-argument rational construction,
univariate polynomial construction/arithmetic over `QQ`, integer
polynomial construction/arithmetic over default `ZZ[x]`, integer factorization
with factor inspection, and `prime_pi(10**6)`. The probe also checks exact
dense matrix determinant, multiplication, and inverse over `ZZ` and `QQ`
through `sage.matrix.constructor`. On WASI the patch routes `QQ[x]` and the
default dense `ZZ[x]` startup through generic polynomial element classes for
now, avoiding eager `polynomial_rational_flint` and
`polynomial_integer_dense_flint` startup while those side-module paths still
need runtime hardening. Explicit `PolynomialRing(ZZ, "x",
implementation="FLINT")` requests are rejected with a normal
`NotImplementedError` on WASI instead of letting that unsafe side-module import
terminate the Node.js process. A remaining follow-up is richer polynomial
factorization support; constructing the generic `QQ[x]` factorization currently
still exits before the Node marker.

The standalone target also runs non-blocking Node.js follow-up probes after the
required exact-math smokes and writes any missing markers to
`dist/wasi-sdk/followups.txt`, with process output in
`dist/wasi-sdk/node-followups.log`. The recorded follow-ups now split the
FLINT-backed polynomial path into the direct integer-polynomial import, the
same import after `ZZ`/`QQ` singleton initialization, the rational and zmod
FLINT polynomial imports after the same initialization, and the shared
`sage.libs.flint.fmpz_poly_sage` helper. The helper import completes after ring
initialization, while the FLINT polynomial side modules still exit before their
Node markers. Incomplete follow-ups are rerun with Python verbose import
tracing so the next runtime hardening pass has the import ladder that led to
the clean exit.

The standalone target also stages an Electron-shaped resources directory under
`dist/wasi-sdk/electron-resources`, hardlinks the Sagelite install and runtime
Python dependencies into that directory, writes a
`sagelite-electron-resources.json` manifest with relative `PYTHONPATH` entries
and required resource paths, and reruns the exact arithmetic and matrix smoke
through the checked-in `src/sagelite-electron-smoke.cjs` async `python-wasm`
worker API. The Electron smoke validates the manifest before launching Python,
including the expected manifest schema, resource kind, CPython WASI ABI,
runtime platform, smoke contract, and root-local POSIX-style relative paths so
the staged resources cannot escape their bundle root or depend on host-specific
path separators. It then checks integer extended-gcd, integer ideal, modular
integer ring, and prime finite-field coverage in addition to the core integer,
rational, polynomial, factorization, `prime_pi`, and dense matrix checks. It
then reruns the same smoke from a relocated copy of that resources tree, which
catches build-output absolute path assumptions and incomplete resource copies
before the resources are handed to Electron packaging. The same smoke is exposed from
`desktop/electron` as `pnpm test:sagelite`, which reruns it through the Electron
package's `python-wasm` dependency without launching the UI. On WASI, `sage.all`
skips writing the lazy-import cache file during startup, since that cache
persistence is not required for the packaged worker path and currently trips
`os.umask` under the worker runtime.

The dependency archives that Sagelite links into CPython side modules are now
rebuilt as position-independent WASM where needed.  NTL, GSL CBLAS, Givaro,
M4RI, M4RIE, MPFI, and MPFR have package-local side-module link coverage; PARI
is also rebuilt with `-fPIC` and retains its standalone `gp`/`libpari` smoke.
MPFI's installed `pkg-config` metadata also carries the MPFR and GMP library
search paths so Sagelite extension links do not lose transitive static archive
locations.
