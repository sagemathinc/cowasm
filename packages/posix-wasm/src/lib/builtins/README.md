I found these math functions in emscripten, but they are copied from LLVM.

They get used indirectly by code in Zig to implement things like csqrt.

I'm only aware of this since I wrote code to scan for and explicitly link every
single thing in libc-wasm-zig. It's clearly an upstream (in zig)Ϩ bug to report
and fix though.