pub fn keepalive() void {}
const std = @import("std");
const errno = @cImport(@cInclude("errno.h"));
const fcntl = @cImport(@cInclude("fcntl.h"));
const netdb = @cImport(@cInclude("netdb.h"));

//const signal = @cImport(@cInclude("signal.h"));

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
    if (eql(name, "SIG_BLOCK")) {
        return 0;
        // signal.SIG_BLOCK isn't even compiled in by zig.  TODO: upstream it.
        // This gets used by libedit only because I modified signal.h for building libedit, so these 0,1,2 values are right.
        //return signal.SIG_BLOCK;
    }
    if (eql(name, "SIG_UNBLOCK")) {
        return 1;
        //return signal.SIG_UNBLOCK;
    }
    if (eql(name, "SIG_SETMASK")) {
        return 2;
        //return signal.SIG_SETMASK;
    }
    if (eql(name, "AF_INET")) {
        return netdb.AF_INET;
    }
    if (eql(name, "AF_INET6")) {
        return netdb.AF_INET6;
    }

    std.debug.print("WARNING: You must add the constant {s} to python-wasm/src/wasm/posix/c-define.zig\n", .{name});
    return -2147483648;
}

extern fn strcmp(s1: [*:0]const u8, s2: [*:0]const u8) c_int;
fn eql(s1: [*:0]const u8, s2: [*:0]const u8) bool {
    return strcmp(s1, s2) == 0;
}
