pub fn keepalive() void {}
const stdio = @cImport(@cInclude("stdio.h"));
const std = @import("std");
const expect = std.testing.expect;

// "The interface __stack_chk_fail() shall abort the function that called it
// with a message that a stack overflow has been detected. The program that
// called the function shall then exit.  The interface
// __stack_chk_fail() does not check for a stack overflow itself. It merely
// reports one when invoked."
export fn __stack_chk_fail() void {
    const stderr = std.io.getStdErr().writer();
    stderr.print("A stack overflow has been detected.\n", .{}) catch |e| {
        std.debug.print("A stack overflow has been detected. - {}\n", .{e});
    };
    std.process.exit(1);
}
