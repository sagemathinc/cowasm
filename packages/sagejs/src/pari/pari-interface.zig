const std = @import("std");
const pari = @import("./pari.zig");

extern fn exec_cb(ptr: [*]const u8, len: usize) void;

extern fn exec(s: [*:0]const u8) void {
    var r = pari.exec(s);
    exec_cb(r, std.mem.lenZ(r));
    std.c.free(r);
}
