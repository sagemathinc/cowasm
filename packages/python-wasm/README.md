# python\-wasm: WebAssembly CPython  for Node.js and the browser

[Demo](https://python-wasm.cocalc.com/)

See [the main repo](https://github.com/sagemathinc/python-wasm/blob/main/README.md) for more information. 

## Using from node.js

Install the package:

```sh
npm install python-wasm
```

The library should work with nodejs version 16.x on Linux, MacOS, and **native** Microsoft Windows.  \(NOTE: for node 14, use the `--experimental-wasm-bigint` flag.\) 

```sh
wstein@max % node
Welcome to Node.js v16.13.0.
Type ".help" for more information.
> python = require('python-wasm')
> await python.init()
> python.exec('a = sum(range(101)); a')    # outputs to stdout
5050
> s = python.repr('a'); s # javascript string
5050
> python.exec('import sys; sys.version')
'3.11.0b3 (main, Jul  8 2022, 23:21:07) [Clang 13.0.1 (git@github.com:ziglang/zig-bootstrap.git 81f0e6c5b902ead84753490d'
> python.repr('sys.platform')
'wasi'
```

## Using in a web application

See [this repo](https://github.com/sagemathinc/python-wasm/tree/main/packages/webpack) for how to use Webpack5 with python\-wasm.

## API

The `python-wasm` module exports four things:

- `init` \- async function; call to ensure WASM code has been initialized
- `exec(code:string)` \- execute code \(output goes to /dev/stdout and /dev/stderr\)
- `repr(expr:string)` \- return representation of an expression as a string
- `wasm` \- object that is defined after `await init()` succeeds.
  - `wasm.fs` \- the [memfs](https://www.npmjs.com/package/memfs) filesystem

