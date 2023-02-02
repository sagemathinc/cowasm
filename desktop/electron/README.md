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

