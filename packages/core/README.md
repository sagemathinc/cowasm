# wapython

See [the main repo](https://github.com/sagemathinc/wapython/blob/main/README.md) for more information about what this is.

## Using wapython from node.js

The following should work with nodejs version 16.x (for node 14 use the `--experimental-wasm-bigint` option) on Linux, MacOS, and **native** Microsoft Windows.

```sh
wstein@max % mkdir wapython && cd wapython && npm init -y && npm install @wapython/core

wstein@max % node  # for older node, use "node --experimental-wasm-bigint"
Welcome to Node.js v16.13.0.
Type ".help" for more information.
> {python} = require('@wapython/core')
> python.exec('2+2')
4
> python.exec('import sys; sys.version')
'3.11.0b3 (main, Jul  8 2022, 23:21:07) [Clang 13.0.1 (git@github.com:ziglang/zig-bootstrap.git 81f0e6c5b902ead84753490d'
> python.exec('import sys; sys.platform')
'wasi'
```

## Using wapython in a webpage

This is not supported yet.
