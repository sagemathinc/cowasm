const std = @import("std");
const unistd = @cImport(@cInclude("unistd.h"));

extern fn dash_main(argc: c_int, argv: [*c][*c]u8) c_int;

pub fn terminal(argc: i32, argv: [*c][*c]u8) !i32 {
    std.debug.print("calling dash... {d}, {s}\n", .{ argc, argv[0] });
    var ret = dash_main(argc, argv);
    std.debug.print("returned with ret={d}\n", .{ret});
    return ret;
}
