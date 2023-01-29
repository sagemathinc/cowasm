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

## Issues

There are of course many, as documented in the GitHub issues: [https://github.com/sagemathinc/cowasm\-python/issues](https://github.com/sagemathinc/cowasm-python/issues)

## How to use pip install from here

This assumes for now that you've [downloaded the
source code](https://github.com/sagemathinc/cowasm-python) for python-wasm and are in the packages/cpython directory.

Build python\-wasm, then run Python's ensurepip to install pip into python\-wasm.
_You_ _**DO NOT**_ _need to build any other packages in the python\-wasm repo \-\- each package_
_works self contained!_

```sh
make
make pip
```

Also make sure you have cowasm-cc, etc. in your path by doing this:

```sh
~$ pwd 
.../cowasm-python/packages/cpython
~$ cd ../..
~$ . bin/env.sh
~$ cd packages/cpython
```

Now you can use pip. Here's an example that involves grabbing
a pure python package from pypi, and then finding that it depends
on regexp

```sh
~$ ./bin/python-wasm -m pip parsimonious
```

The result is some new files in site-packages, which are compiled
for WebAssembly:

```
~$ ls dist/wasm/lib/python3.11/site-packages/
README.txt                              pip-22.3.dist-info
_distutils_hack                         pkg_resources
distutils-precedence.pth                regex
parsimonious                            regex-2022.10.31-py3.11.egg-info
parsimonious-0.10.0.dist-info           setuptools
pip                                     setuptools-65.5.0.dist-info

~$ ls dist/wasm/lib/python3.11/site-packages/regex/*.so
dist/wasm/lib/python3.11/site-packages/regex/_regex.cpython-311-wasm32-wasi.so
```

You could then bundle them up somehow and include them wherever you want
to use python-wasm... (TODO: better workflow and instructions to come in the future -- see https://github.com/sagemathinc/cowasm-python/issues/7).
