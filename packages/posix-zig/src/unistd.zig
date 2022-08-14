const c = @import("c.zig");
const node = @import("node.zig");
const unistd = @cImport(@cInclude("unistd.h"));

pub fn register(env: c.napi_env, exports: c.napi_value) !void {
    try node.registerFunction(env, exports, "chroot", chroot);
    try node.registerFunction(env, exports, "getegid", getegid);
    try node.registerFunction(env, exports, "geteuid", geteuid);
    try node.registerFunction(env, exports, "gethostname", gethostname);
    try node.registerFunction(env, exports, "getpgid", getpgid);
    try node.registerFunction(env, exports, "getppid", getppid);
    try node.registerFunction(env, exports, "setpgid", setpgid);
    try node.registerFunction(env, exports, "setegid", setegid);
    try node.registerFunction(env, exports, "seteuid", seteuid);
    try node.registerFunction(env, exports, "setregid", setregid);
    try node.registerFunction(env, exports, "setreuid", setreuid);
    try node.registerFunction(env, exports, "setsid", setsid);
    try node.registerFunction(env, exports, "ttyname", ttyname);
}

// int chroot(const char *path);
fn chroot(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 1) catch return null;
    var buf: [1024]u8 = undefined;
    node.string_from_value(env, argv[0], "path", 1024, &buf) catch return null;
    if (unistd.chroot(&buf) == -1) {
        node.throwError(env, "chroot failed");
    }
    return null;
}

// uid_t getegid(void);
fn getegid(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    _ = info;
    const pid = unistd.getegid();
    return node.create_u32(env, pid) catch return null;
}

// uid_t geteuid(void);
fn geteuid(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    _ = info;
    const pid = unistd.geteuid();
    return node.create_u32(env, pid) catch return null;
}

// int gethostname(char *name, size_t namelen);
fn gethostname(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    _ = info;
    var name: [1024]u8 = undefined;
    if (unistd.gethostname(&name, 1024) == -1) {
        node.throwError(env, "error in gethostname");
    }
    // cast because we know name is null terminated.
    return node.create_string_from_ptr(env, @ptrCast([*:0]const u8, &name)) catch return null;
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

// pid_t getppid(void);
fn getppid(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    _ = info;
    const pid = unistd.getppid();
    return node.create_i32(env, pid) catch return null;
}

// int setegid(gid_t gid);
fn setegid(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 1) catch return null;
    const gid = node.u32_from_value(env, argv[0], "gid") catch return null;
    if (unistd.setegid(gid) == -1) {
        node.throwError(env, "error in setegid");
    }
    return null;
}

// int seteuid(uid_t uid);
fn seteuid(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 1) catch return null;
    const uid = node.u32_from_value(env, argv[0], "uid") catch return null;
    if (unistd.seteuid(uid) == -1) {
        node.throwError(env, "error in seteuid");
    }
    return null;
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

// int setregid(gid_t rgid, gid_t egid);
fn setregid(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 2) catch return null;
    const rgid = node.u32_from_value(env, argv[0], "rgid") catch return null;
    const egid = node.u32_from_value(env, argv[1], "egid") catch return null;
    if (unistd.setregid(rgid, egid) == -1) {
        node.throwError(env, "error in setregid");
    }
    return null;
}

// int setreuid(uid_t ruid, uid_t euid);
fn setreuid(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 2) catch return null;
    const ruid = node.u32_from_value(env, argv[0], "ruid") catch return null;
    const euid = node.u32_from_value(env, argv[1], "euid") catch return null;
    if (unistd.setreuid(ruid, euid) == -1) {
        node.throwError(env, "error in setreuid");
    }
    return null;
}

// pid_t setsid(void);
fn setsid(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    _ = info;
    const pid = unistd.setsid();
    if (pid == -1) {
        node.throwError(env, "error in setsid");
        return null;
    }
    return node.create_i32(env, pid) catch return null;
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
