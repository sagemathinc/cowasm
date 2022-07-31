# dynlink \-\- Support for dynamic linking of WebAssembly code via Javascript built using wasm32\-unknown\-emscripten

## Scope

I care about implementing enough to support loading Python extension modules.  In particular, I'm not worried about dependencies, i.e., loading all the dynamic libraries that a given dynamic library depends on.

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

