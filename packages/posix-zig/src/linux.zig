// Functionality that is only on linux.   Might not even be in posix!
const node = @import("node.zig");
const unistd = @cImport({
    @cDefine("__USE_GNU", "1");
    @cInclude("unistd.h");
});
const c = @import("c.zig");

pub fn register(env: c.napi_env, exports: c.napi_value) !void {
    try node.registerFunction(env, exports, "getresuid", getresuid_impl);
    try node.registerFunction(env, exports, "getresgid", getresgid_impl);
    try node.registerFunction(env, exports, "setresuid", setresuid_impl);
    try node.registerFunction(env, exports, "setresgid", setresgid_impl);
}

// These uid_t and gid_t are actually u32.
// Also, for some reason unistd.getresuid, etc., isn't available in headers, which is
// maybe a bug in zig (?).
extern fn getresuid(ruid: *unistd.uid_t, euid: *unistd.uid_t, suid: *unistd.uid_t) c_int;

fn getresuid_impl(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    _ = info;
    var ruid: unistd.uid_t = undefined;
    var euid: unistd.uid_t = undefined;
    var suid: unistd.uid_t = undefined;
    if (getresuid(&ruid, &euid, &suid) == -1) {
        node.throwError(env, "getresuid failed");
        return null;
    }
    var object = node.createObject(env, "") catch return null;
    const _ruid = node.create_u32(env, ruid, "ruid") catch return null;
    node.setNamedProperty(env, object, "ruid", _ruid, "") catch return null;
    const _euid = node.create_u32(env, euid, "euid") catch return null;
    node.setNamedProperty(env, object, "euid", _euid, "") catch return null;
    const _suid = node.create_u32(env, suid, "suid") catch return null;
    node.setNamedProperty(env, object, "suid", _suid, "") catch return null;
    return object;
}
// // int getresgid(gid_t *rgid, gid_t *egid, gid_t *sgid);
extern fn getresgid(rgid: *unistd.gid_t, egid: *unistd.gid_t, sgid: *unistd.gid_t) c_int;

fn getresgid_impl(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    _ = info;
    var rgid: unistd.gid_t = undefined;
    var egid: unistd.gid_t = undefined;
    var sgid: unistd.gid_t = undefined;
    if (getresgid(&rgid, &egid, &sgid) == -1) {
        node.throwError(env, "getresgid failed");
        return null;
    }
    var object = node.createObject(env, "") catch return null;
    const _rgid = node.create_u32(env, rgid, "rgid") catch return null;
    node.setNamedProperty(env, object, "rgid", _rgid, "") catch return null;
    const _egid = node.create_u32(env, egid, "egid") catch return null;
    node.setNamedProperty(env, object, "egid", _egid, "") catch return null;
    const _sgid = node.create_u32(env, sgid, "sgid") catch return null;
    node.setNamedProperty(env, object, "sgid", _sgid, "") catch return null;
    return object;
}

// // int setresuid(uid_t ruid, uid_t euid, uid_t suid);
extern fn setresuid(ruid: unistd.uid_t, euid: unistd.uid_t, suid: unistd.uid_t) c_int;

fn setresuid_impl(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 3) catch return null;
    const ruid = node.u32FromValue(env, argv[0], "ruid") catch return null;
    const euid = node.u32FromValue(env, argv[1], "euid") catch return null;
    const suid = node.u32FromValue(env, argv[1], "suid") catch return null;
    if (setresuid(ruid, euid, suid) == -1) {
        node.throwError(env, "error in setresuid");
    }
    return null;
}

// int setresgid(gid_t rgid, gid_t egid, gid_t sgid);
extern fn setresgid(rgid: unistd.gid_t, egid: unistd.gid_t, sgid: unistd.gid_t) c_int;

fn setresgid_impl(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 3) catch return null;
    const rgid = node.u32FromValue(env, argv[0], "rgid") catch return null;
    const egid = node.u32FromValue(env, argv[1], "egid") catch return null;
    const sgid = node.u32FromValue(env, argv[1], "sgid") catch return null;
    if (setresgid(rgid, egid, sgid) == -1) {
        node.throwError(env, "error in setresgid");
    }
    return null;
}
