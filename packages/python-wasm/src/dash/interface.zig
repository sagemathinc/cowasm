const std = @import("std");
const dash = @import("./dash.zig");
const interface = @import("../interface.zig");
const posix = @import("../wasm/posix.zig");

export fn keepalive() void {
    posix.keepalive();
}

extern fn wasmSetException() void;

export fn terminal(argc: i32, argv: [*c][*c]u8) i32 {
    return dash.terminal(argc, argv) catch |err| {
        wasmSetException();
        std.debug.print("python error: '{}'\nwhen starting terminal", .{err});
        return 1;
    };
}


export fn c_malloc(n: usize) ?*anyopaque {
    return std.c.malloc(n);
}

export fn c_free(ptr: ?*anyopaque) void {
    return std.c.free(ptr);
}
