const c = @import("c.zig");
const node = @import("node.zig");
const unistd = @cImport(@cInclude("unistd.h"));

pub fn register(env: c.napi_env, exports: c.napi_value) !void {
    try node.registerFunction(env, exports, "ttyname", ttyname);
    try node.registerFunction(env, exports, "getppid", getppid);
    try node.registerFunction(env, exports, "getpgid", getpgid);
    try node.registerFunction(env, exports, "setpgid", setpgid);
}

// char *ttyname(int fd);
fn ttyname(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 1) catch return null;
    const fd = node.i32_from_value(env, argv[0], "fd") catch return null;
    const name = unistd.ttyname(fd);
    if (name == null) {
        node.throwError(env, "invalid file descriptor");
        return null;
    }
    return node.create_string_from_ptr(env, name) catch return null;
}

// pid_t getppid(void);
fn getppid(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    _ = info;
    const pid = unistd.getppid();
    return node.create_i32(env, pid) catch return null;
}

// pid_t getpgid(pid_t pid);
fn getpgid(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 1) catch return null;
    const pid = node.i32_from_value(env, argv[0], "pid") catch return null;
    const pgid = unistd.getpgid(pid);
    if (pgid == -1) {
        node.throwError(env, "error in getpgid");
        return null;
    }
    return node.create_i32(env, pgid) catch return null;
}

// int setpgid(pid_t pid, pid_t pgid);
fn setpgid(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 2) catch return null;
    const pid = node.i32_from_value(env, argv[0], "pid") catch return null;
    const pgid = node.i32_from_value(env, argv[1], "pgid") catch return null;
    if (unistd.setpgid(pid, pgid) == -1) {
        node.throwError(env, "error in setpgid");
    }
    return null;
}
