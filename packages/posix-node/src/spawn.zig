const c = @import("c.zig");
const node = @import("node.zig");
const util = @import("util.zig");
const std = @import("std");
const spawn = @cImport({
    @cInclude("spawn.h");
    @cInclude("sched.h");
    @cInclude("signal.h");
});
const builtin = @import("builtin");

pub fn register(env: c.napi_env, exports: c.napi_value) !void {
    try node.registerFunction(env, exports, "_posix_spawn", posix_spawn);
}

//      int
//      posix_spawn(pid_t *restrict pid, const char *restrict path,
//          const posix_spawn_file_actions_t *file_actions,
//          const posix_spawnattr_t *restrict attrp,
//          char *const argv[restrict], char *const envp[restrict]);

// returns the pid
// posix_spawn(path: string, fileActions, attributes, argv:string[], envp:string[]) : number

fn posix_spawn(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const args = node.getArgv(env, info, 6) catch return null;

    var path = node.valueToString(env, args[0], "path") catch return null;
    defer std.c.free(path);

    var file_actions: spawn.posix_spawn_file_actions_t = undefined;
    if (spawn.posix_spawn_file_actions_init(&file_actions) != 0) {
        node.throwErrno(env, "error in posix_spawn calling spawn.posix_spawn_file_actions_init");
        return null;
    }

    const lenFileActions = node.arrayLength(env, args[1], "fileActions") catch return null;
    var index: u32 = 0;
    const bufsize = 1024; // also used for a path below
    var buf: [bufsize]u8 = undefined;
    while (index < lenFileActions) : (index += 1) {
        const fileAction = node.getArrayElement(env, args[1], index, "fileActions") catch return null;
        const action = node.getArrayElement(env, fileAction, 0, "fileAction") catch return null;
        node.stringFromValue(env, action, "fileAction[0]", bufsize, &buf) catch return null;
        // it should be "addclose", "addopen", or "adddup2".
        if (buf[3] == "c"[0]) { // ["addclose", fd]
            const fd = node.i32FromValue(env, node.getArrayElement(env, fileAction, 1, "fd") catch return null, "fd") catch return null;
            if (spawn.posix_spawn_file_actions_addclose(&file_actions, fd) != 0) {
                try node.throw(env, "call to posix_spawn_file_actions_addclose failed") catch return null;
            }
        } else if (buf[3] == "o"[0]) { // ["addopen", fd, path, oflag, mode]
            const fd = node.i32FromValue(env, node.getArrayElement(env, fileAction, 1, "fd") catch return null, "fd") catch return null;
            node.stringFromValue(env, node.getArrayElement(env, fileAction, 2, "path") catch return null, "path", bufsize, &buf) catch return null;
            const oflag = node.i32FromValue(env, node.getArrayElement(env, fileAction, 3, "oflag") catch return null, "oflag") catch return null;
            const mode = @intCast(spawn.mode_t, node.u32FromValue(env, node.getArrayElement(env, fileAction, 4, "mode") catch return null, "mode") catch return null);
            if (spawn.posix_spawn_file_actions_addopen(&file_actions, fd, &buf, oflag, mode) != 0) {
                try node.throw(env, "call to posix_spawn_file_actions_addopen failed") catch return null;
            }
        } else if (buf[3] == "d"[0]) { // ["adddup2", fd, new_fd]
            const fd = node.i32FromValue(env, node.getArrayElement(env, fileAction, 1, "fd") catch return null, "fd") catch return null;
            const new_fd = node.i32FromValue(env, node.getArrayElement(env, fileAction, 2, "new_fd") catch return null, "new_fd") catch return null;
            if (spawn.posix_spawn_file_actions_adddup2(&file_actions, fd, new_fd) != 0) {
                try node.throw(env, "call to posix_spawn_file_actions_adddup2 failed") catch return null;
            }
        } else {
            try node.throw(env, "invalid fileAction") catch return null;
        }
    }

    var attr: spawn.posix_spawnattr_t = undefined;
    if (spawn.posix_spawnattr_init(&attr) != 0) {
        node.throwErrno(env, "error in posix_spawn calling spawn.posix_spawnattr_init");
        return null;
    }
    if (builtin.target.os.tag == .linux) {
        // posix_spawnattr_setschedparam and posix_spawnattr_setschedpolicy seem to not exist on macos (maybe only on linux?)
        if (node.hasNamedProperty(env, args[2], "sched_priority", "property of spawnattr") catch return null) {
            const sched_priority = node.i32_from_object(env, args[2], "sched_priority") catch return null;
            var schedparam = std.mem.zeroInit(spawn.sched_param, .{});
            schedparam.sched_priority = sched_priority;
            if (spawn.posix_spawnattr_setschedparam(&attr, &schedparam) != 0) {
                try node.throw(env, "call to posix_spawnattr_setpgroup failed") catch return null;
            }
        }
        if (node.hasNamedProperty(env, args[2], "schedpolicy", "property of spawnattr") catch return null) {
            const schedpolicy = node.i32_from_object(env, args[2], "schedpolicy") catch return null;
            if (spawn.posix_spawnattr_setschedpolicy(&attr, schedpolicy) != 0) {
                try node.throw(env, "call to posix_spawnattr_setschedpolicy failed") catch return null;
            }
        }
    }
    if (node.hasNamedProperty(env, args[2], "flags", "property of spawnattr") catch return null) {
        const flags = node.i16_from_object(env, args[2], "flags") catch return null;
        if (spawn.posix_spawnattr_setflags(&attr, flags) != 0) {
            try node.throw(env, "call to posix_spawnattr_setflags failed") catch return null;
        }
    }
    if (node.hasNamedProperty(env, args[2], "pgroup", "property of spawnattr") catch return null) {
        const pgroup = node.i32_from_object(env, args[2], "pgroup") catch return null;
        if (spawn.posix_spawnattr_setpgroup(&attr, pgroup) != 0) {
            try node.throw(env, "call to posix_spawnattr_setpgroup failed") catch return null;
        }
    }
    if (node.hasNamedProperty(env, args[2], "sigmask", "property of spawnattr") catch return null) {
        const sigmask = node.getNamedProperty(env, args[2], "sigmask", "property of spawnattr") catch return null;
        var sigset: spawn.sigset_t = undefined;
        sigset_t_fromArray(env, sigmask, "sigmask", &sigset) catch return null;
        if (spawn.posix_spawnattr_setsigmask(&attr, &sigset) != 0) {
            try node.throw(env, "call to posix_spawnattr_setsigmask failed") catch return null;
        }
    }
    if (node.hasNamedProperty(env, args[2], "sigdefault", "property of spawnattr") catch return null) {
        const sigdefault = node.getNamedProperty(env, args[2], "sigdefault", "property of spawnattr") catch return null;
        var sigset: spawn.sigset_t = undefined;
        sigset_t_fromArray(env, sigdefault, "sigset", &sigset) catch return null;
        if (spawn.posix_spawnattr_setsigdefault(&attr, &sigset) != 0) {
            try node.throw(env, "call to posix_spawnattr_setsigdefault failed") catch return null;
        }
    }

    var argv = node.valueToArrayOfStrings(env, args[3], "argv") catch return null;
    defer util.freeArrayOfStrings(argv);

    var envp = node.valueToArrayOfStrings(env, args[4], "envp") catch return null;
    defer util.freeArrayOfStrings(envp);

    var p = node.valueToBool(env, args[5], "p") catch return null;

    var pid: spawn.pid_t = undefined;
    var ret = if (p) spawn.posix_spawnp(&pid, path, &file_actions, &attr, argv, envp) else spawn.posix_spawn(&pid, path, &file_actions, &attr, argv, envp);
    if (ret != 0) {
        node.throwErrno(env, "error in posix_spawn calling spawn.posix_spawn");
        return null;
    }
    return node.create_i32(env, pid, "pid") catch return null;
}

fn sigset_t_fromArray(env: c.napi_env, array: c.napi_value, comptime message: [:0]const u8, setPtr: *spawn.sigset_t) !void {
    if (spawn.sigemptyset(setPtr) != 0) {
        return node.throw(env, "failed to init signal set -- " ++ message);
    }
    const len = try node.arrayLength(env, array, "sigset_t_fromArray");
    var i: i32 = 0;
    while (i < len) : (i += 1) {
        const s = try node.getArrayElement(env, array, @intCast(u32, i), "getting signal from set");
        const signum = try node.i32FromValue(env, s, "signum");
        if (spawn.sigaddset(setPtr, signum) != 0) {
            return node.throw(env, "failed to add a signal to the set -- " ++ message);
        }
    }
}
