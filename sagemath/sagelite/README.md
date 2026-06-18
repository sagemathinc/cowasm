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
drivers, uses a package-local `pkg-config` shim for WASI `.pc` discovery, and
records the first missing configure blocker in `dist/wasi-sdk/status.txt`.

The current blocker is `cypari2`: Meson reaches the Sagelite dependency probe
for `cypari2` after finding CoWasm Python, Cython, NumPy headers, gmpy2,
cysignals, memory_allocator, Meson, Ninja, the WASI compilers, and `gmp`
through package-local metadata.
