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
smoke path, so incomplete resource copies fail before the worker starts. The
Sagelite package target also reruns the same smoke from a relocated copy of the
resources tree so absolute build-output paths do not silently become packaging
requirements.

The Electron main process also consumes that same manifest when launching the
interactive Python worker. During development it looks for
`../../sagemath/sagelite/dist/wasi-sdk/electron-resources` from the compiled
main-process files. In packaged builds, Electron Forge copies that directory as
an extra resource and the app resolves it from `process.resourcesPath`.

Set `COWASM_SAGELITE_ELECTRON_RESOURCES=/path/to/electron-resources` to test a
different staged Sagelite resource tree without rebuilding the app.
