It would be nice to use zig to write code for extension modules to python-wasm.
This is *impossible* until zig can create -fPIC wasm code from *zig* code.
Right now it's possible to create fPIC code from C/C++ code, but not wasm.
Fixing that will involve changing the zig compiler a bit to work with the
wasm32-emscripten target.  It might be easy, but I don't know...

Anyway, this is just a tiny bit of code to try out when figuring that out...
