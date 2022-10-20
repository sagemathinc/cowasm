const std = @import("std");
const cowasm = @import("./cowasm.zig");
const interface = @import("../interface.zig");
//const signal = @import("../python/signal/signal.zig");
const posix = @import("../wasm/posix.zig");

export fn keepalive() void {
  //  signal.keepalive();
    posix.keepalive();
}

extern fn wasmSetException() void;

export fn terminal(argc: i32, argv: [*c][*c]u8) i32 {
    return cowasm.terminal(argc, argv) catch |err| {
        wasmSetException();
        std.debug.print("error: '{}'\nwhen starting {}", .{err, argv[0]});
        return 1;
    };
}


export fn c_malloc(n: usize) ?*anyopaque {
    return std.c.malloc(n);
}

export fn c_free(ptr: ?*anyopaque) void {
    return std.c.free(ptr);
}



export fn _Py_CheckEmscriptenSignals() void {
}

export fn _Py_CheckEmscriptenSignalsPeriodically() void {
}
