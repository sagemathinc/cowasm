pub fn keepalive() void {}
const unistd = @cImport(@cInclude("unistd.h"));
const std = @import("std");
const expect = std.testing.expect;

export fn getpid() unistd.pid_t {
    return 1;
}

test "getpid" {
    try expect(getpid() == 1);
}

// We view the user and group as 0, e.g., "root".
export fn getgid() unistd.gid_t {
    return 0;
}

test "getgid" {
    try expect(getgid() == 0);
}

export fn getegid() unistd.gid_t {
    return 0;
}

test "getegid" {
    try expect(getegid() == 0);
}

export fn getuid() unistd.uid_t {
    return 0;
}

test "getuid" {
    try expect(getuid() == 0);
}

export fn geteuid() unistd.uid_t {
    return 0;
}

test "geteuid" {
    try expect(geteuid() == 0);
}

