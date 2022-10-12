const std = @import("std");
const unistd = @cImport(@cInclude("unistd.h"));

extern fn zython_dash_vforkexec(argv: [*c][*c]u8, path:[*c]u8) c_int;

pub fn terminal(argc: i32, argv: [*c][*c]u8) !i32 {
    _ = argc; // actually argv is assumed null terminated itself.
    // We assume argv[0] is the full absolute path.
    var ret = zython_dash_vforkexec(argv, 0);
    return ret;
}

fn print_args(argc: i32, argv: [*c][*c]u8) void {
    var i : usize = 0;
    while (i < argc) : (i += 1) {
        std.debug.print("argv[{d}] = '{s}'\n", .{ i, argv[i] });
    }
}
