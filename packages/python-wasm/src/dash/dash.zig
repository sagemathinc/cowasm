const std = @import("std");
const unistd = @cImport(@cInclude("unistd.h"));

extern fn __main_argc_argv(argc: c_int, argv: [*][*]u8) c_int;

pub fn init() !void {
    std.debug.print("we would start dash...\n", .{});
    __main_argc_argv(0, 0);
}
