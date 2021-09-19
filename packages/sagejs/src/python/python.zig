const python = @cImport(@cInclude("Python.h"));
const std = @import("std");

var isInitialized = false;
export fn init() void {
    if (isInitialized) return;
    isInitialized = true;
    python.Py_Initialize();
}

export fn finalize() c_int {
    if (!isInitialized) return 0;
    isInitialized = false;
    return python.Py_FinalizeEx();
}

export fn add() void {
    _ = python.PyRun_SimpleString("print('2 + 3 =', 2 + 3)\n");
}

const expect = std.testing.expect;
// test "calling init" {
//     init();
//     add();
//     _ = finalize();
// }

fn junk_file0() !void {
    std.debug.print("\nHOME = {s}\n", .{std.os.getenv("HOME") orelse unreachable});
    //     var x = std.fs.wasi.PreopenList.init(std.testing.allocator);
    //     defer x.deinit();
    //     try x.populate();
    //     std.debug.print("\nstd.fs.wasi.PreopenList = {s}\n", .{x.asSlice()});
    //     _ = try std.fs.createFileAbsolute("/tmp/x", .{});
}

export fn junk_file() void {
    junk_file0() catch |err| {
        std.debug.print("FAILED creating /tmp/x -- {} \n", .{err});
        return;
    };
}

test "createFile, write, seekTo, read" {
    try junk_file0();
}

pub fn main() !void {
    junk_file0();
}
