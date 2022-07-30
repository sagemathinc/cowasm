# dynlink \-\- Support for dynamic linking of WebAssembly code via Javascript built using wasm32\-unknown\-emscripten

This will be available soon.

Right now there is just one interesting example in the examples directory.

## References

There doesn't seem to be an actual write up of how dynamic linking actually works with WebAssembly, and I think the official WebAssembly project gave up on it in favor of other things that don't exist yet.   it got implemented for emscripten \(mainly [here](https://github.com/emscripten-core/emscripten/blob/main/src/library_dylink.js)\). 

- [https://emscripten.org/docs/compiling/Dynamic\-Linking.html](https://emscripten.org/docs/compiling/Dynamic-Linking.html) 
- [https://github.com/emscripten\-core/emscripten/blob/main/src/library\_dylink.js](https://github.com/emscripten-core/emscripten/blob/main/src/library_dylink.js) 
- https://lld.llvm.org/WebAssembly.html
- [https://groups.google.com/g/llvm\-dev/c/O5cOc4VCSLI/m/o519lIR2BAAJ](https://groups.google.com/g/llvm-dev/c/O5cOc4VCSLI/m/o519lIR2BAAJ)
- I read the section in chapter 7 of "WebAssembly: The Definitive Guide" on "Dynamic Linking in WebAssembly"  and it is only a brief and misleading regarding this particular topic.

