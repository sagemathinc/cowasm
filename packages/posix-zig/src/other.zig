const c = @import("c.zig");
const node = @import("node.zig");
const std = @import("std");
const builtin = @import("builtin");
const util = @import("util.zig");

pub fn register(env: c.napi_env, exports: c.napi_value) !void {
    if (builtin.target.os.tag == .linux) {
        try node.registerFunction(env, exports, "login_tty", login_tty);
    }
    try node.registerFunction(env, exports, "_statvfs", statvfs_impl);
}

// int login_tty(int fd);
fn login_tty(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    if (builtin.target.os.tag == .linux) {
        const utmp = @cImport(@cInclude("utmp.h"));
        const argv = node.getArgv(env, info, 1) catch return null;
        const uid = node.i32FromValue(env, argv[0], "fd") catch return null;
        if (utmp.login_tty(uid) == -1) {
            node.throwError(env, "error in login_tty");
            return null;
        }
        return null;
    } else {
        node.throwError(env, "login_tty not supported on this platform");
    }
}

const statvfs = @cImport({
    @cDefine("struct_statvfs", "struct statvfs");
    @cInclude("sys/statvfs.h");
});
// int statvfs(const char *restrict path, struct statvfs *restrict buf);
// int fstatvfs(int fd, struct statvfs *buf);

fn statvfs_impl(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 1) catch return null;
    var path: [1024]u8 = undefined;
    node.stringFromValue(env, argv[0], "path", 1024, &path) catch return null;
    var buf: statvfs.struct_statvfs = undefined;
    if (statvfs.statvfs(&path, &buf) == -1) {
        node.throwError(env, "statsvfs failed -- invalid input");
        return null;
    }
    const s = util.structToNullTerminatedJsonString(statvfs.struct_statvfs, buf) catch {
        node.throwError(env, "statsvfs failed -- problem converting output");
        return null;
    };
    defer std.c.free(s);
    return node.createStringFromPtr(env, s, "statsvfs") catch return null;
}
