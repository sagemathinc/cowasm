# WebAssembly version of Python

Right now this is just some bash script to create a
WebAssembly build of Python via emscripten that can
be used via Node.js to run a line of code from the
command line.

**Motivation**:

- Pyodide [doesn't support using their build from node.js](https://github.com/pyodide/pyodide/issues/14).
- This package is part of a [bigger](https://www.npmjs.com/package/@sagemath) [project](https://github.com/sagemathinc/?q=wasm) to bring the capabilities of mathematical software to the Javascript ecosystem (browser, nodejs/deno servers, edge computing like cloudflare), and use the Javascript runtime as a common place to tie them all together.  Thus our needs are different from Pyodide.

## Quickstart

This is a _**work in progress**_ and the module has no public export yet.  You can still try it out as follows:

```sh
$ npm install @sagemath/python
$ cd node_modules/@sagemath/python/dist
$ node ./python.js -c 'print("hello world", 2+3)'
...
hello world 5
```

If you have a script `a.py` in the current directory, you can run it like so:
```sh
$ node ./python.js -c "`cat ./a.py`"
```

## Build from source

This will download and build Python  from source, and copy the resulting WebAssembly build into `dist/` , assuming you have [installed the emscripten toolchain](https://emscripten.org/docs/getting_started/downloads.html).

```sh
$ ./build.sh
```

## Todo

The first goal is the Python test suite, which currently doesn't even start:

```sh
$ node ./python.js -m test
```

## Acknowledgement and Related/Inspirational Projects

- This is inspired by the Python build part of [Pyodide](https://pyodide.org/en/stable/).  In particular, all our patches to Python in the patches subdir come from there.
- The [python-emscripten](https://github.com/python-emscripten/python) project looks potentially relevant and useful.
