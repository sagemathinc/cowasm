# WebAssembly version of Python built using Zig / Clang

## Motivation

- Pyodide [doesn't fully support using their build from node.js](https://github.com/pyodide/pyodide/issues/14), whereas we do support it here.

- Using zig as a build system is faster than using pyodide \+ emscripten.

## Build from source

This is part of a bigger package. Install the python\-wasm github repo, then type make, and this will get built along the way.

The build is done entirely using Zig, so doesn't depend at all on having clang or gcc installed on your system. It works on MacOS and Linux, both aarch64 and x86_64. The resulting build contains:

- **dist/native:** a minimal native build of CPython which exists entirely to bootstrap the WebAssembly cross\-compilation
- **dist/wasm:** a WASM build of CPython, which includes some .so shared libraries that are built `-fPIC` so they can be loader by a loader \(see the dylink package\). This also includes `dist/wasm/lib/dist/python311.zip` which is a minimal zip archive of pyc files, and currently also includes some .so files.

## The Test Suite

If you run

```sh
make test
```

then the full CPython test suite for the WebAssembly build gets run properly.
Currently a large number of tests _do pass_, but also there are **many that fail**. For example, in the Decimal module there's hundreds of tests that pass and exactly one that fails causing a full SEGFAULT.

The test suite runs on the server, "orchestrated" by our native build of cpython, and using node.js + our WASI and Posix support.

A major medium-term goal for this project is to get the entire test suite to pass.  

Note that running `make test` at the top level of `python-wasm` does NOT run the large full cpython test suite yet, since there are numerous failures.

