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
    wasmSendString(ptr, std.mem.lenZ(r));
}

// export fn toJSON(s: [*:0]const u8) void {
//     const r = python.toJSON(interface.allocator(), s) catch |err| {
//         //todo
//         std.debug.print("python error: '{}'\nwhen exporting '{s}' to JSON", .{ err, s });
//         return;
//     };
//     defer interface.allocator().free(r);
//     const ptr: [*]const u8 = r[0..1];
//     wasmSendString(ptr, std.mem.lenZ(r));
// }
