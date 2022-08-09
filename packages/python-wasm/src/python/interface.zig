const std = @import("std");
const python = @import("./python.zig");
const interface = @import("../interface.zig");
const signal = @import("./signal/signal.zig");
const posix = @import("../wasm/posix.zig");

export fn keepalive() void {
    signal.keepalive();
    posix.keepalive();
}

export fn init() void {
    python.init() catch |err| {
        wasmSetException();
        std.debug.print("python error: '{}'\nwhen initializing python runtime", .{err});
        return;
    };
}

// TODO: would like to say what the exception actually is. For now, at least inform
// that it happened.
extern fn wasmSetException() void;

export fn exec(s: [*:0]const u8) void {
    python.exec(s) catch |err| {
        //todo
        wasmSetException();
        std.debug.print("python error: '{}'\nwhen evaluating '{s}'", .{ err, s });
        return;
    };
}

export fn terminal(argc: i32, argv: [*c][*c]u8) i32 {
    return python.terminal(argc, argv) catch |err| {
        wasmSetException();
        std.debug.print("python error: '{}'\nwhen starting terminal", .{err});
        return 1;
    };
}

extern fn wasmSendString(ptr: [*]const u8, len: usize) void;

export fn eval(s: [*:0]const u8) void {
    const r = python.eval(interface.allocator(), s) catch |err| {
        //todo
        std.debug.print("python error: '{}'\nwhen evaluating '{s}'", .{ err, s });
        return;
    };
    defer interface.allocator().free(r);
    // Todo: this r[0..1] is a casting hack -- I think it's harmless
    // because r itself is null terminated (?).
    const ptr: [*]const u8 = r[0..1];
    wasmSendString(ptr, std.mem.len(r));
}

// export fn toJSON(s: [*:0]const u8) void {
//     const r = python.toJSON(interface.allocator(), s) catch |err| {
//         //todo
//         std.debug.print("python error: '{}'\nwhen exporting '{s}' to JSON", .{ err, s });
//         return;
//     };
//     defer interface.allocator().free(r);
//     const ptr: [*]const u8 = r[0..1];
//     wasmSendString(ptr, std.mem.len(r));
// }

export fn c_malloc(n: usize) ?*anyopaque {
    return std.c.malloc(n);
}

export fn c_free(ptr: ?*anyopaque) void {
    return std.c.free(ptr);
}

export fn stringLength(ptr: [*:0]const u8) u32 {
    var i: u32 = 0;
    while (ptr[i] != 0) {
        i += 1;
    }
    return i;
}
