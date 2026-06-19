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
CoWasm Python, Cython, NumPy, gmpy2, cysignals, memory_allocator, Meson, Ninja,
compiler, and pkg-config paths, and then runs direct `meson setup`. It does not
use build isolation and does not run `pip install sagelite`.

## Current Status

The package boundary now exists, includes package-local host Meson and Ninja
drivers, uses a package-local `pkg-config` shim for WASI `.pc` discovery, wires
in the `cypari2` build-support include surface, and records the first configure,
compile, install, or Node.js import blocker in `dist/wasi-sdk/status.txt`.

The current `cypari2` package is build-support only: it provides the package
marker and Cython declarations needed by Sagelite's configure/Cython phases,
but it does not yet provide the compiled `cypari2` runtime extension modules.

The current probe uses CPython's `dist/wasi-sdk` header/runtime surface via
`python-wasi-sdk`, so it no longer needs to hide system scheduler declarations
with `_SCHED_H`.  It also preincludes a small fenv compatibility header, enables
WASI emulated signal declarations for sources that include `<signal.h>`, drops
Meson's unsupported GNU archive group markers in a probe-local compiler wrapper,
and globally exposes the CoWasm Boost, GSL, MPFR, MPFI, and NTL include surfaces
for Sagelite extension targets that do not inherit all required Meson
dependencies.

With the matching LinBox `BlockHankel` accessor patch applied, the standalone
probe gets through Meson configure, compile, and install.  It now also runs a
Node.js `python-wasm` import ladder against the installed Sage package tree.
The first plain `import sage` succeeds, and the current runtime blocker is
`import sage.env`, which fails because `platformdirs` is not packaged yet for
the CoWasm Python runtime.  The probe records the traceback in
`dist/wasi-sdk/node-import.log`.

The dependency archives that Sagelite links into CPython side modules are now
rebuilt as position-independent WASM where needed.  NTL, GSL CBLAS, Givaro,
M4RI, M4RIE, MPFI, and MPFR have package-local side-module link coverage; PARI
is also rebuilt with `-fPIC` and retains its standalone `gp`/`libpari` smoke.
MPFI's installed `pkg-config` metadata also carries the MPFR and GMP library
search paths so Sagelite extension links do not lose transitive static archive
locations.
