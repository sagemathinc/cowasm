# Using [python-wasm](https://www.npmjs.com/package/python-wasm) with [webpack](https://webpack.js.org/)

You can use `python-wasm` with webpack5.  There are two things
you may have to modify in your webpack configuration.
See [webpack.config.js](./webpack.config.js), in particular:


- The NodePolyfillPlugin is needed because python-wasm
  uses memfs, which requires several polyfilled libraries.

- The wasm and zip asset/resource rules are needed so python-wasm
  can import the python wasm binary and zip filesystem.
  
Thus your `webpack.config.js` has to include this:
```js
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

module.exports = {
  plugins: [
    new NodePolyfillPlugin(),
    // ...
  ],
  module: {
    rules: [
      {
        test: /\.wasm$|\.zip$/,
        type: "asset/resource",
      },
      //...
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

in your code and use the `python` object, as illustrated here
in [src/index.ts](./src/index.ts).


## Trying the demo in your browser

```sh
git clone https://github.com/sagemathinc/python-wasm
cd python-wasm/packages/webpack
npm ci
npm run serve
```

Then visit the URL that it outputs, which is probably http://localhost:8080

