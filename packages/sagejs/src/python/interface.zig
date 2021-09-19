const std = @import("std");
const python = @import("./python.zig");

// extern fn exec_cb(ptr: [*]const u8, len: usize) void;

export fn init() void {
    python.init();
}

export fn exec(s: [*:0]const u8) void {
    python.exec(s) catch |err| {
        //todo
        std.debug.print("python error: '{}'\nwhen evluating '{s}'", .{ err, s });
        return;
    };
    // exec_cb(r, std.mem.lenZ(r));
}

export fn add() void {
    python.add();
}
