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
CoWasm Python, Cython, NumPy, gmpy2, cysignals, memory_allocator, compiler, and
pkg-config paths, and then runs direct `meson setup`. It does not use build
isolation and does not run `pip install sagelite`.

## Current Status

The package boundary now exists, and the smoke records the first missing
configure blocker in `dist/wasi-sdk/status.txt`.

In a minimal development environment the expected current blocker is missing
host `meson`/`ninja`. Once those build-system tools are packaged or installed,
the same target should advance to the next Meson configure blocker, expected to
be one of the remaining hard build dependencies such as `cypari2` or native
library discovery.
