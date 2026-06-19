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
compile, or install blocker in `dist/wasi-sdk/status.txt`.

The current `cypari2` package is build-support only: it provides the package
marker and Cython declarations needed by Sagelite's configure/Cython phases,
but it does not yet provide the compiled `cypari2` runtime extension modules.
The current probe gets through Meson configure and starts the Ninja compile.
The next blockers are compile-time issues around Sagelite's Cython include
environment, Python build helpers such as `jinja2`, and MPFI/MPFR declaration
compatibility.
