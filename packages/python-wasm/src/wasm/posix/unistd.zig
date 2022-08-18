pub fn keepalive() void {}
const std = @import("std");
const expect = std.testing.expect;
const c_import = @cImport(@cInclude("fcntl.h"));

pub const constants = .{
    .c_import = c_import,
    .names = [_][:0]const u8{ "O_CLOEXEC", "O_NONBLOCK" },
};
