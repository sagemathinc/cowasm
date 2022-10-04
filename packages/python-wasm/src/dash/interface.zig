const std = @import("std");
const dash = @import("./dash.zig");
const interface = @import("../interface.zig");
const posix = @import("../wasm/posix.zig");

export fn keepalive() void {
    posix.keepalive();
}

extern fn wasmSetException() void;

export fn dash_init() void {
    dash.init() catch |err| {
        wasmSetException();
        std.debug.print("dash error: '{}'\nwhen initializing dash runtime", .{err});
        return;
    };
}

export fn c_malloc(n: usize) ?*anyopaque {
    return std.c.malloc(n);
}

export fn c_free(ptr: ?*anyopaque) void {
    return std.c.free(ptr);
}
