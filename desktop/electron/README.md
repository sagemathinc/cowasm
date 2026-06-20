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
Schema 18 manifests also require the pure-Python rational-field, modular-ring,
and prime finite-field constructor files used by the exact arithmetic smoke, so
those missing files fail validation before the worker starts.
Schema 9 manifests also include the current `cypari2` fail-closed runtime
contract: Electron resources must contain the build-support `cypari2` files
needed by Sagelite, and the smoke asserts that PARI calls still raise the
expected WASI `NotImplementedError` until the compiled PARI runtime is ported.

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
