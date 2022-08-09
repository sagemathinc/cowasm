# WebAssembly version of Python built using Zig / Clang

## Motivation

- Pyodide [doesn't fully support using their build from node.js](https://github.com/pyodide/pyodide/issues/14), whereas we do support it here.

- Using zig + clang is faster than using pyodide + emscripten.

## Build from source

This is part of a bigger package.  Install the python\-wasm github repo, then type make, and this will get built along the way. 

The build is done entirely using Zig, so doesn't depend at all on having clang or gcc installed on your system.  It works on MacOS and Linux, both aarch64 and x86\_64.  The resulting build contains:

- **dist/native:** a minimal native build of CPython which exists entirely to bootstrap the WebAssembly cross\-compilation
- **dist/wasm:** a WASM build of CPython, which includes some .so shared libraries that are built `-fPIC` so they can be loader by a loader \(see the dylink package\).  This also includes `dist/wasm/lib/dist/python311.zip` which is a minimal zip archive of pyc files, and currently also includes some .so files.

