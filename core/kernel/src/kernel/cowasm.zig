const std = @import("std");
const unistd = @cImport(@cInclude("unistd.h"));

extern fn cowasm_vforkexec(argv: [*c][*c]u8, path: [*c]u8) c_int;

pub fn exec(argc: i32, argv: [*c][*c]u8) !i32 {
    _ = argc; // actually argv is assumed null terminated itself.
    // We assume argv[0] is the full absolute path.
    var ret = cowasm_vforkexec(argv, 0);
    return ret;
}

fn print_args(argc: i32, argv: [*c][*c]u8) void {
    var i: usize = 0;
    while (i < argc) : (i += 1) {
        std.debug.print("argv[{d}] = '{s}'\n", .{ i, argv[i] });
    }
}
