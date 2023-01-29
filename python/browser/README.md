# Using [CoWasm](https://cowasm.org) in a browser

[🔗 Try the CoWasm shell](https://cowasm.sh)

This package illustrates and tests use of CoWasm in a web browser.

## Using [webpack](https://webpack.js.org/)

For a more complicated example, see [the terminal](../terminal/README.md).

You can use `python-wasm` with webpack5. There are **two things**
you may have to modify in your [webpack configuration](./webpack.config.js):

1. The `NodePolyfillPlugin` is required because `python-wasm` uses `memfs`, which requires several polyfilled libraries.

2. The wasm and zip asset/resource rules are needed so python\-wasm
   can import the python wasm binary and zip filesystem.

Thus your `webpack.config.js` might include the following:

```js
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

module.exports = {
  plugins: [new NodePolyfillPlugin()],
  module: {
    rules: [
      {
        test: /\.wasm$|\.zip$/,
        type: "asset/resource",
      },
    ],
  },
};
```

Once you do that, you can just put

```js
const python = require("python-wasm");
```

or (for Typescript)

```ts
import python from "python-wasm";
```

in your code and use the `python` object, as illustrated
in [src/index.ts](./src/index.ts).

## Run the demo for yourself

Clone the repo:

```sh
git clone https://github.com/sagemathinc/cowasm
cd cowasm/packages/browser
```

Install and start the server:

```sh
npm install
npm run serve
```

Then visit the URL that it outputs, which is probably http://localhost:8080

**Supported Platforms:** I've tested the above with node v16 and v18 on Linux, MacOS, and Microsoft Windows.

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

## Firefox and Service Workers

Unlike Safari and Chrome, Firefox doesn't allow service workers over http without setting `dom.serviceWorkers.testing.enabled`, so set that to true in `about:config` to test locally. Also, [Firefox doesn't implement support for service workers in incognito mode](https://bugzilla.mozilla.org/show_bug.cgi?id=1320796).

