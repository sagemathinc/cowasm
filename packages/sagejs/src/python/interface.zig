const std = @import("std");
const python = @import("./python.zig");
var gpa = std.heap.GeneralPurposeAllocator(.{}){};

export fn init() void {
    python.init();
}

export fn exec(s: [*:0]const u8) void {
    python.exec(s) catch |err| {
        //todo
        std.debug.print("python error: '{}'\nwhen evluating '{s}'", .{ err, s });
        return;
    };
}

extern fn eval_cb(ptr: [*]const u8, len: usize) void;
export fn eval(s: [*:0]const u8) void {
    const r = python.eval(&gpa.allocator, s) catch |err| {
        //todo
        std.debug.print("python error: '{}'\nwhen evaluating '{s}'", .{ err, s });
        return;
    };
    defer gpa.allocator.free(r);
    // Todo: this r[0..1] is a casting hack -- I think it's harmless
    // bcause r itself is null terminated (?).
    const ptr: [*]const u8 = r[0..1];
    eval_cb(ptr, std.mem.lenZ(r));
}
