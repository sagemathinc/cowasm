pub fn keepalive() void {}
const std = @import("std");
const expect = std.testing.expect;
const unistd = @cImport({
    @cInclude("unistd.h");
    @cInclude("fcntl.h"); // just needed for constants
});

pub const constants = .{
    .c_import = unistd,
    .names = [_][:0]const u8{ "O_CLOEXEC", "O_NONBLOCK", "F_ULOCK", "F_LOCK", "F_TLOCK", "F_TEST" },
};
