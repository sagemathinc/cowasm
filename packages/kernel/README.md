# python\-wasm: WebAssembly CPython  for Node.js and the browser

DEMOS:

- https://cowasm.org  (uses Atomics and SharedArrayBuffers)
- https://sw.cowasm.org (uses Service Workers)

See [the main repo](https://github.com/sagemathinc/cowasm/blob/main/README.md) for more information. 

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
> await python.init();
> await python.exec('a = sum(range(101)); print(a)')   # outputs to stdout
5050
> s = await python.repr('a'); s # javascript string
5050
> await python.exec('import sys; print(sys.version)')
'3.11.0b3 (main, Jul  8 2022, 23:21:07) [Clang 13.0.1 (git@github.com:ziglang/zig-bootstrap.git 81f0e6c5b902ead84753490d'
> await python.repr('sys.platform')
"'wasi'"
```

You can also start a full session with readline support \(yes, this is real!\):

```sh
$ node
> require('python-wasm').terminal()
>>> 2+3   # you can edit with readline!
5
>>> 1/0  
Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
ZeroDivisionError: division by zero
>>> quit() or ctrl+d
```

## Using in a web application

See [this repo](https://github.com/sagemathinc/cowasm/tree/main/packages/webpack) for how to use Webpack5 with python\-wasm.

## API

The `python-wasm` module exports:

- `exec(code:string)` \- execute code \(output goes to /dev/stdout and /dev/stderr\)
- `repr(expr:string)` \- return representation of an expression as a string
- `terminal` \- start interactive Python terminal that has full readline support

