# WebAssembly build of libffi (NOT FINISHED)

SOURCES: The two files in libffi-emscripten are modified versions of files I found at https://github.com/hoodmane/libffi-emscripten

**WARNING: This to actually not done yet!**

There are several functions in `src/libffi-emscripten/src/wasm32/ffi.c` that need to be re-implemented to
work in the context of CoWasm.  Right now they are stubs that
print that they are stubs.
