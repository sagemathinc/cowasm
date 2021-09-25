const std = @import("std");
const pari = @import("./pari.zig");

extern fn wasmSendString(ptr: [*]const u8, len: usize) void;

export fn exec(s: [*:0]const u8) void {
    var r = pari.exec(s) catch |err| {
        //todo
        std.debug.print("pari interface exec error: {}\n", .{err});
        return;
    };
    wasmSendString(r, std.mem.lenZ(r));
    std.c.free(r);
}
