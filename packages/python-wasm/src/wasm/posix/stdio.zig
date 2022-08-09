pub fn keepalive() void {}
const stdio = @cImport(@cInclude("stdio.h"));
const std = @import("std");
const expect = std.testing.expect;

// These three functions are about locking files for *threads*, and we don't
// support threads in any nontrivial way yet, so these are no-ops.
export fn flockfile(filehandle: ?*stdio.FILE) void {
    _ = filehandle;
}

test "flockfile" {
    flockfile(null);
}

export fn ftrylockfile(filehandle: ?*stdio.FILE) c_int {
    _ = filehandle;
    return 0;
}

test "flockfile" {
    try expect(ftrylockfile(null) == 0);
}

export fn funlockfile(filehandle: ?*stdio.FILE) void {
    _ = filehandle;
}

test "funlockfile" {
    funlockfile(null);
}
