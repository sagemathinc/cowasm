# Terminal Demo

## Using [python\-wasm](https://www.npmjs.com/package/python-wasm) with [webpack](https://webpack.js.org/)

You can use `python-wasm` with webpack5.  There are two things
you may have to modify in your webpack configuration.
See [webpack.config.js](./webpack.config.js), in particular:

- The `NodePolyfillPlugin` is required because `python-wasm` uses `memfs`, which requires several polyfilled libraries.

- The wasm and zip asset/resource rules are needed so python\-wasm
  can import the python wasm binary and zip filesystem.

- Your webserver must have the following two headers set, so that SharedArrayBuffers are allowed \([GitHub pages does not support this](https://github.com/github-community/community/discussions/13309)\):
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: require-corp`

Thus your `webpack.config.js` has to include this:

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
  },
  devServer: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
};

```

<!-- Once you do that, put

```js
const python = require("python-wasm");
```

or (for Typescript)

```ts
import python from "python-wasm";
```

in your code and use the `python` object, as illustrated here
in [src/index.ts](./src/index.ts). -->

## Trying this demo in your browser

```sh
git clone https://github.com/sagemathinc/python-wasm
cd python-wasm/packages/terminal
npm ci
npm run serve
```

Then visit the URL that it outputs, which is probably http://localhost:8080

