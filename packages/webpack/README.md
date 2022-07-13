# Webpack Python Examples

You can use `python-wasm` with webpack5.  There are two things
you may have to modify in your webpack configuration.
See [webpack.config.js](./webpack.config.js), in particular:


- The NodePolyfillPlugin is needed because python-wasm
  uses memfs, which requires several polyfilled libraries.

- The wasm and zip asset/resource rules are needed so python-wasm
  can import the python wasm binary and zip filesystem.

Once you do that, you can just put

```
import python from "python-wasm";
```

in your code and use the `python` object, as illustrated here
in [src/index.ts](./src/index.ts).