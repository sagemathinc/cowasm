const std = @import("std");
const posix = @import("../wasm/posix.zig");

export fn keepalive() void {
    posix.keepalive();
}

extern fn wasmSetException() void;

export fn c_malloc(n: usize) ?*anyopaque {
    var ptr = std.c.malloc(n);
    std.debug.print("doing malloc and got ptr = {*}\n",.{ptr});
    return ptr;
}

export fn c_free(ptr: ?*anyopaque) void {
    return std.c.free(ptr);
}
