pub fn keepalive() void {}
const std = @import("std");
const errno = @cImport(@cInclude("errno.h"));
const fcntl = @cImport(@cInclude("fcntl.h"));

// Every constant that we make available must be explicitly declared here:
// We use the smallest c int as a sentinel to indicate a bug due to a constant
// not being here (I checked and no constants are #define'd to this in musl).
// This sentinel is used in code in the wrapper function for this in c-define.ts
export fn cDefine(name: [*:0]const u8) c_int {
    if (eql(name, "AT_FDCWD")) {
        return fcntl.AT_FDCWD;
    }
    if (eql(name, "EBADF")) {
        return errno.EBADF;
    }
    if (eql(name, "ENOENT")) {
        return errno.ENOENT;
    }
    std.debug.print("WARNING: You must add the constant {s} to python-wasm/src/wasm/posix/c-define.zig\n", .{name});
    return -2147483648;
}

extern fn strcmp(s1: [*:0]const u8, s2: [*:0]const u8) c_int;
fn eql(s1: [*:0]const u8, s2: [*:0]const u8) bool {
    return strcmp(s1, s2) == 0;
}
