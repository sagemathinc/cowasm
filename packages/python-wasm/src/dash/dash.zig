const std = @import("std");
const unistd = @cImport(@cInclude("unistd.h"));

//extern fn __main_argc_argv(argc: c_int, argv: [*]([*:0]u8)) c_int;
extern fn cmdloop(a: c_int) c_int;

pub fn init(argc: i32, argv: [*][*:0]u8) !void {
    std.debug.print("calling dash... {d}, {s}\n", .{ argc, argv[0] });
    //var ret = __main_argc_argv(argc, argv);
    var ret = cmdloop(1);
    std.debug.print("returned with ret={d}\n", .{ret});
}
