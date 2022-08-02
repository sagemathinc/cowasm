# dylink - WebAssembly dynamic loader

This is a WebAssembly dynamic loader for the ABI used by emscripten and the llvm backend when targeting emscripten.  It runs both on node.js and in the browser.

## Scope

I care about implementing enough of the linker spec to support loading Python extension modules.  In particular, I'm probably not worried about dependencies, i.e., automatically loading all the dynamic libraries that dynamic library depends on.

## Why?

There is already code [in emscripten
itself](https://github.com/emscripten-core/emscripten/blob/main/src/library_dylink.js)
that fully implements the dynamic loader spec. However, I would like to build
and run WebAssembly modules using a lightweight modern toolchain built around
Zig instead.  It is thus necessary to implement a self\-contained dynamic loader.

PR's welcome to implement more!

## References

There doesn't seem to be an actual write up of how dynamic linking actually works with WebAssembly, and I think the official WebAssembly project gave up on it in favor of other things that don't exist yet.   it got implemented for emscripten \(mainly [here](https://github.com/emscripten-core/emscripten/blob/main/src/library_dylink.js)\). 

- [https://github.com/WebAssembly/tool\-conventions/blob/main/DynamicLinking.md](https://github.com/WebAssembly/tool-conventions/blob/main/DynamicLinking.md)  \- this describes "the current WebAssembly dynamic linking ABI used by emscripten and by the llvm backend when targeting emscripten", and is probably the most relevant technical document.  Of course, I stumbled on it way too late.
- [https://emscripten.org/docs/compiling/Dynamic\-Linking.html](https://emscripten.org/docs/compiling/Dynamic-Linking.html) 
- [https://github.com/emscripten\-core/emscripten/blob/main/src/library\_dylink.js](https://github.com/emscripten-core/emscripten/blob/main/src/library_dylink.js) 
- https://lld.llvm.org/WebAssembly.html
- [https://groups.google.com/g/llvm\-dev/c/O5cOc4VCSLI/m/o519lIR2BAAJ](https://groups.google.com/g/llvm-dev/c/O5cOc4VCSLI/m/o519lIR2BAAJ)
- There is a section in Chapter 7 of ["WebAssembly: The Definitive Guide" ](https://www.oreilly.com/library/view/webassembly-the-definitive/9781492089834/)on "Dynamic Linking in WebAssembly". Unfortunately, it is very brief regarding this particular topic, and doesn't emphasize the critical importance of `-fPIC` \(position independent code\), which is really what makes dynamic linking possible.
- [An interesting discussion about dynamic modules and rust](https://github.com/rust-lang/rust/issues/60231)
- I wrote something on StackOverflow linking to the above [here.](https://stackoverflow.com/questions/71803962/is-it-possible-to-add-a-new-function-to-an-instantiated-webassembly-module/73212320#73212320) 

