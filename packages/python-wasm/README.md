# python\-wasm: WebAssembly CPython  for Node.js and the browser

See [the main repo](https://github.com/sagemathinc/python-wasm/blob/main/README.md) for more information. 

## Using python-wasm from node.js

The following should work with nodejs version 16.x on Linux, MacOS, and **native** Microsoft Windows.  \(NOTE: for node 14, use the `--experimental-wasm-bigint` flag.\) 

```sh
wstein@max % mkdir test && cd test && npm init -y
wstein@max % npm install python-wasm
wstein@max % node
Welcome to Node.js v16.13.0.
Type ".help" for more information.
> python = require('pthon-wasm')
> python.exec('a=2+3; a')    # outputs to stdout
5
> s = python.repr('a'); s # javascript string
5
> python.exec('import sys; sys.version')
'3.11.0b3 (main, Jul  8 2022, 23:21:07) [Clang 13.0.1 (git@github.com:ziglang/zig-bootstrap.git 81f0e6c5b902ead84753490d'
> python.exec('import sys; sys.platform')
'wasi'
```

## Using python\-wasm in a web application

See [this repo](https://github.com/sagemathinc/python-wasm/tree/main/packages/webpack) for how to use Webpack5 with python\-wasm.
