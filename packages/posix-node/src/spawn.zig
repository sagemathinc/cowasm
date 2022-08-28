const c = @import("c.zig");
const node = @import("node.zig");
const util = @import("util.zig");
const std = @import("std");
const spawn = @cImport(@cInclude("spawn.h"));
const errno = @cImport(@cInclude("errno.h"));

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
        node.throwError(env, "error in posix_spawn calling spawn.posix_spawn_file_actions_init");
        return null;
    }
    // TODO: init with input args

    var attrp: spawn.posix_spawnattr_t = undefined;
    if (spawn.posix_spawnattr_init(&attrp) != 0) {
        node.throwError(env, "error in posix_spawn calling spawn.posix_spawnattr_init");
        return null;
    }
    // TODO: init with input args

    var argv = node.valueToArrayOfStrings(env, args[3], "argv") catch return null;
    defer util.freeArrayOfStrings(argv);

    var envp = node.valueToArrayOfStrings(env, args[4], "envp") catch return null;
    defer util.freeArrayOfStrings(envp);

    var p = node.valueToBool(env, args[5], "p") catch return null;

    var pid: spawn.pid_t = undefined;
    var ret = if (p) spawn.posix_spawnp(&pid, path, &file_actions, &attrp, argv, envp) else spawn.posix_spawn(&pid, path, &file_actions, &attrp, argv, envp);
    if (ret != 0) {
        std.debug.print("errno = {}\n", .{std.c._errno().*});
        node.throwError(env, "error in posix_spawn calling spawn.posix_spawn");
        return null;
    }
    return node.create_i32(env, pid, "pid") catch return null;
}
