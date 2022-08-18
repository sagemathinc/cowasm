const c = @import("c.zig");
const node = @import("node.zig");
const unistd = @cImport(@cInclude("unistd.h"));
const builtin = @import("builtin");
const util = @import("util.zig");
const std = @import("std");

pub fn register(env: c.napi_env, exports: c.napi_value) !void {
    try node.registerFunction(env, exports, "chroot", chroot);
    try node.registerFunction(env, exports, "getegid", getegid);
    try node.registerFunction(env, exports, "geteuid", geteuid);
    try node.registerFunction(env, exports, "gethostname", gethostname);
    try node.registerFunction(env, exports, "getpgid", getpgid);
    try node.registerFunction(env, exports, "getppid", getppid);
    try node.registerFunction(env, exports, "getpgrp", getpgrp);
    try node.registerFunction(env, exports, "setpgid", setpgid);
    try node.registerFunction(env, exports, "setegid", setegid);
    try node.registerFunction(env, exports, "seteuid", seteuid);
    try node.registerFunction(env, exports, "sethostname", sethostname);
    try node.registerFunction(env, exports, "setregid", setregid);
    try node.registerFunction(env, exports, "setreuid", setreuid);
    try node.registerFunction(env, exports, "setsid", setsid);
    try node.registerFunction(env, exports, "ttyname", ttyname);
    try node.registerFunction(env, exports, "alarm", alarm);

    try node.registerFunction(env, exports, "_execve", execve);
}

// int chroot(const char *path);
fn chroot(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 1) catch return null;
    var buf: [1024]u8 = undefined;
    node.stringFromValue(env, argv[0], "path", 1024, &buf) catch return null;
    if (unistd.chroot(&buf) == -1) {
        node.throwError(env, "chroot failed");
    }
    return null;
}

// uid_t getegid(void);
fn getegid(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    _ = info;
    const pid = unistd.getegid();
    return node.create_u32(env, pid, "pid") catch return null;
}

// uid_t geteuid(void);
fn geteuid(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    _ = info;
    const pid = unistd.geteuid();
    return node.create_u32(env, pid, "pid") catch return null;
}

// int gethostname(char *name, size_t namelen);
fn gethostname(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    _ = info;
    var name: [1024]u8 = undefined;
    if (unistd.gethostname(&name, 1024) == -1) {
        node.throwError(env, "error in gethostname");
    }
    // cast because we know name is null terminated.
    return node.createStringFromPtr(env, @ptrCast([*:0]const u8, &name), "hostname") catch return null;
}

// pid_t getpgid(pid_t pid);
fn getpgid(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 1) catch return null;
    const pid = node.i32FromValue(env, argv[0], "pid") catch return null;
    const pgid = unistd.getpgid(pid);
    if (pgid == -1) {
        node.throwError(env, "error in getpgid");
        return null;
    }
    return node.create_i32(env, pgid, "pgid") catch return null;
}

// pid_t getpgrp(void);
fn getpgrp(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    _ = info;
    const pid = unistd.getppid();
    return node.create_i32(env, pid, "pid") catch return null;
}

// pid_t getppid(void);
fn getppid(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    _ = info;
    const pid = unistd.getppid();
    return node.create_i32(env, pid, "pid") catch return null;
}

// int setegid(gid_t gid);
fn setegid(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 1) catch return null;
    const gid = node.u32FromValue(env, argv[0], "gid") catch return null;
    if (unistd.setegid(gid) == -1) {
        node.throwError(env, "error in setegid");
    }
    return null;
}

// int seteuid(uid_t uid);
fn seteuid(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 1) catch return null;
    const uid = node.u32FromValue(env, argv[0], "uid") catch return null;
    if (unistd.seteuid(uid) == -1) {
        node.throwError(env, "error in seteuid");
    }
    return null;
}

// int sethostname(const char *name, size_t len);
fn sethostname(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 1) catch return null;
    var buf: [1024]u8 = undefined;
    node.stringFromValue(env, argv[0], "name", 1024, &buf) catch return null;
    const len = node.strlen(@ptrCast([*:0]const u8, &buf));
    // Interestingly the type of second argument sethostname depends on the operating system.
    if (builtin.target.os.tag == .linux) {
        if (unistd.sethostname(&buf, len) == -1) {
            node.throwError(env, "error setting host name");
        }
    } else {
        if (unistd.sethostname(&buf, @intCast(c_int, len)) == -1) {
            node.throwError(env, "error setting host name");
        }
    }
    return null;
}

// int setpgid(pid_t pid, pid_t pgid);
fn setpgid(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 2) catch return null;
    const pid = node.i32FromValue(env, argv[0], "pid") catch return null;
    const pgid = node.i32FromValue(env, argv[1], "pgid") catch return null;
    if (unistd.setpgid(pid, pgid) == -1) {
        node.throwError(env, "error in setpgid");
    }
    return null;
}

// int setregid(gid_t rgid, gid_t egid);
fn setregid(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 2) catch return null;
    const rgid = node.u32FromValue(env, argv[0], "rgid") catch return null;
    const egid = node.u32FromValue(env, argv[1], "egid") catch return null;
    if (unistd.setregid(rgid, egid) == -1) {
        node.throwError(env, "error in setregid");
    }
    return null;
}

// int setreuid(uid_t ruid, uid_t euid);
fn setreuid(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 2) catch return null;
    const ruid = node.u32FromValue(env, argv[0], "ruid") catch return null;
    const euid = node.u32FromValue(env, argv[1], "euid") catch return null;
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
    return node.create_i32(env, pid, "pid") catch return null;
}

// char *ttyname(int fd);
fn ttyname(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 1) catch return null;
    const fd = node.i32FromValue(env, argv[0], "fd") catch return null;
    const name = unistd.ttyname(fd);
    if (name == null) {
        node.throwError(env, "invalid file descriptor");
        return null;
    }
    return node.createStringFromPtr(env, name, "ttyname") catch return null;
}

// unsigned alarm(unsigned seconds);
fn alarm(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 1) catch return null;
    const seconds = node.u32FromValue(env, argv[0], "seconds") catch return null;
    const ret = unistd.alarm(seconds); // doesn't return any error no matter what.
    return node.create_u32(env, ret, "ret") catch return null;
}

const UnistdError = error{Dup2Fail};

fn dupStream(env: c.napi_env, comptime name: [:0]const u8, number: i32) !void {
    const stream = try node.getStreamFd(env, name);
    if (unistd.dup2(stream, number) == -1) {
        node.throwError(env, "dup2 failed on " ++ name);
        return UnistdError.Dup2Fail;
    }
    if (unistd.close(stream) == -1) {
        node.throwError(env, "closing fd failed " ++ name);
        return UnistdError.Dup2Fail;
    }
}

// int execve(const char *pathname, char *const argv[], char *const envp[]);
//  execve: (pathname: string, argv: string[], envp: string[]) => number;
// TODO: we should change last arg to be a map, like with python.
fn execve(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const args = node.getArgv(env, info, 3) catch return null;

    var pathname = node.valueToString(env, args[0], "pathname") catch return null;
    defer std.c.free(pathname);

    var argv = node.valueToArrayOfStrings(env, args[1], "argv") catch return null;
    defer util.freeArrayOfStrings(argv);

    var envp = node.valueToArrayOfStrings(env, args[2], "envp") catch return null;
    defer util.freeArrayOfStrings(envp);

    // Critical to dup2 these are we'll see nothing after running execve:
    dupStream(env, "stdin", 0) catch return null;
    dupStream(env, "stdout", 1) catch return null;
    dupStream(env, "stderr", 2) catch return null;

    // NOTE: On success, execve() does not return (!), on error -1 is returned,
    // and errno is set to indicate the error.
    // **TODO: this is working but is very annoying because node isn't surrendering stdout/stdout/etc., so
    // it silently appears to die.**  But a simple example writing to a file shows this works.
    const ret = unistd.execve(pathname, argv, envp);
    if (ret == -1) {
        node.throwError(env, "error in execve");
        return null;
    }
    // This can't ever happen, of course.
    return node.create_i32(env, ret, "ret") catch return null;
}
