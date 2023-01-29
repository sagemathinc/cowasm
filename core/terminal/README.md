# Terminal Demo

Try the Python-Wasm Live Demos:

- https://cowasm.org  (uses Atomics and SharedArrayBuffers)
- https://zython.org (uses Service Workers)

This is a demo of [xterm.js](https://xtermjs.org/) and [webpack](https://webpack.js.org/) with python-wasm.

## Using [python\-wasm](https://www.npmjs.com/package/python-wasm) with [webpack](https://webpack.js.org/)

You can use `python-wasm` with webpack5.  There are **two things**
you may have to modify in your webpack configuration.
See [webpack.config.js](./webpack.config.js), in particular:

1. The `NodePolyfillPlugin` is required because `python-wasm` uses `memfs`, which requires several polyfilled libraries.

2. The wasm and zip asset/resource rules are needed so python\-wasm
   can import the python wasm binary and zip filesystem.

Thus your `webpack.config.js` might include the following:

```js
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

module.exports = {
  plugins: [
    new NodePolyfillPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.wasm$|\.zip$/,
        type: "asset/resource",
      },
    ],
  }
};

```

## Synchronous IO

To use `Atomic` and `SharedArrayBuffer` for synchronous IO, your webserver must have the following two headers set:

- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

Your `webpack.config.js` would then include:

```js
module.exports = {
  // ...
  devServer: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
};

```

This is _**optional:**_ if you don't set the headers, then a service worker is
used instead to support synchronous IO. No special setup is needed to use the
service worker. If you do set these heϨaders, then other things on a complicated
website may break since it's a highly restrictive security policy, e.g., [GitHub
pages does not support
this](https://github.com/github-community/community/discussions/13309).

## Run the demo for yourself

Clone the repo:

```sh
git clone https://github.com/sagemathinc/cowasm
cd cowasm/packages/terminal
npm install
npm run serve
```

Then visit the URL that it outputs, which is probably http://localhost:8080.  You can then use Python.   In addition the following should work:

- control\+c to interrupt running computations
- `input('foo')` for interactive input
- `import time; time.sleep(3)` for sleep that doesn't just burn CPU

Do the following to force the fallback to service workers:

```sh
SW=true npm run serve
```

Note that the service worker approach causes a page refresh the very first time the page is loaded, so that the active service worker takes over proxying certain requests.

**Supported Platforms:** I've tested the above with node v14, v16 and v18 on Linux, MacOS, and Microsoft Windows.  On Windows, you have to directly edit webpack.config.js to test out service workers.

### Firefox and Service Workers

Unlike Safari and Chrome, Firefox doesn't allow service workers over http without setting `dom.serviceWorkers.testing.enabled,` so set that to true in `about:config` to test locally.

