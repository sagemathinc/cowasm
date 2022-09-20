# Using [python-wasm](https://www.npmjs.com/package/python-wasm) with [webpack](https://webpack.js.org/)

[🔗 Try the Python-Wasm Live Demo](https://zython.org)

This is an extremely minimal example. For a more complicated example, see [the terminal](../terminal/README.md).

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
git clone https://github.com/sagemathinc/zython
cd zython/packages/webpack
```

Delete these three lines from package.json (which are used
for development):

```js
  "workspaces": [
    "../python-wasm"
  ],
```

then install and start the server:

```sh
npm install
npm run serve
```

Then visit the URL that it outputs, which is probably http://localhost:8080

**Supported Platforms:** I've tested the above with node v14, v16 and v18 on Linux, MacOS, and Microsoft Windows.

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

Unlike Safari and Chrome, Firefox doesn't allow service workers over http without setting dom.serviceWorkers.testing.enabled, so set that to true in about:config to test locally.
