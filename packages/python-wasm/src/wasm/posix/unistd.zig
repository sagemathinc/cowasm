const unistd = @cImport(@cInclude("unistd.h"));

export fn getpid() unistd.pid_t {
    return 1;
}

pub fn exported() void {
    _ = getpid();
}


const std = @import("std");
const expect = std.testing.expect;

test "getpid" {
    try expect(getpid() == 1);
}