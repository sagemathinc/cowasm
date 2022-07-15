const std = @import("std");
const python = @import("./python.zig");
const interface = @import("../interface.zig");

export fn init() void {
    python.init();
}

export fn exec(s: [*:0]const u8) void {
    python.exec(s) catch |err| {
        //todo
        std.debug.print("python error: '{}'\nwhen evaluating '{s}'", .{ err, s });
        return;
    };
}

export fn pymain(argv_json: [*:0]const u8) void {
    python.pymain(interface.allocator(), argv_json) catch |err| {
        std.debug.print("python error: '{}'\nwhen running pymain '{s}'", .{ err, argv_json });
        return;
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
