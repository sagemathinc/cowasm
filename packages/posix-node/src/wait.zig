const c = @import("c.zig");
const node = @import("node.zig");
const std = @import("std");
const wait = @cImport(@cInclude("sys/wait.h"));

pub const constants = .{
    .c_import = wait,
    .names = [_][:0]const u8{ "WNOHANG", "WUNTRACED", "WCONTINUED" },
};

pub fn register(env: c.napi_env, exports: c.napi_value) !void {
    try node.registerFunction(env, exports, "waitpid", waitpid);
}

//  pid_t waitpid(pid_t pid, int *wstatus, int options);

// waitpid(pid: number, options : number) => {status: Status, ret:number}

fn waitpid(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 2) catch return null;
    const pid = node.i32FromValue(env, argv[0], "pid") catch return null;
    const options = node.i32FromValue(env, argv[1], "options") catch return null;

    var wstatus: c_int = undefined;
    const ret = wait.waitpid(pid, &wstatus, options);
    if (ret == -1) {
        node.throwError(env, "error calling wait.waitpid");
        return null;
    }
    // TODO
    return null;
}
