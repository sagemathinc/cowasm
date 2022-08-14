const c = @import("c.zig");
const translate = @import("translate.zig");
const unistd = @cImport(@cInclude("unistd.h"));

pub fn register(env: c.napi_env, exports: c.napi_value) !void {
    try translate.registerFunction(env, exports, "ttyname", ttyname);
    try translate.registerFunction(env, exports, "getppid", getppid);
    try translate.registerFunction(env, exports, "getpgid", getpgid);
}

// char *ttyname(int fd);
fn ttyname(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const fd = translate.i32_from_info(env, info, "fd") catch return null;
    const name = unistd.ttyname(fd);
    if (name == null) {
        translate.throwError(env, "invalid file descriptor");
        return null;
    }
    return translate.create_string_from_ptr(env, name) catch return null;
}

// pid_t getppid(void);
fn getppid(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    _ = info;
    const pid = unistd.getppid();
    return translate.create_i32(env, pid) catch return null;
}

// pid_t getpgid(pid_t pid);
fn getpgid(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const pid = translate.i32_from_info(env, info, "fd") catch return null;
    const pgid = unistd.getpgid(pid);
    if (pgid == -1) {
        translate.throwError(env, "error in getpgid");
        return null;
    }
    return translate.create_i32(env, pgid) catch return null;
}
