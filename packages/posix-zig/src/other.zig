const c = @import("c.zig");
const node = @import("node.zig");
const util = @cImport(@cInclude("utmp.h"));
const std = @import("std");

pub fn register(env: c.napi_env, exports: c.napi_value) !void {
    try node.registerFunction(env, exports, "login_tty", login_tty);
}

// int login_tty(int fd);
fn login_tty(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 1) catch return null;
    const uid = node.i32FromValue(env, argv[0], "fd") catch return null;
    if (util.login_tty(uid) == -1) {
        node.throwError(env, "error in login_tty");
    }
    return null;
}
