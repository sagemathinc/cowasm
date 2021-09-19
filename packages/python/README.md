# WebAssembly version of Python

**Motivation**:

- Pyodide [doesn't support using their build from node.js](https://github.com/pyodide/pyodide/issues/14).


## Native Python

Run via
```sh
LD_LIBRARY_PATH=`pwd`/dist/native/lib dist/native/bin/python3
```