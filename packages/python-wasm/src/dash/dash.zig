const std = @import("std");
const unistd = @cImport(@cInclude("unistd.h"));

extern fn dash_main(argc: c_int, argv: [*c][*c]u8) c_int;

pub fn terminal(argc: i32, argv: [*c][*c]u8) !i32 {
    // std.debug.print("dash.terminal: calling dash_main with args\n", .{});
    // print_args(argc, argv);
    var ret = dash_main(argc, argv);
    // std.debug.print("terminal: dash_main returned with ret={d}\n", .{ret});
    return ret;
}

fn print_args(argc: i32, argv: [*c][*c]u8) void {
    var i : usize = 0;
    while (i < argc) : (i += 1) {
        std.debug.print("argv[{d}] = '{s}'\n", .{ i, argv[i] });
    }
}
