const c = @import("c.zig");
const node = @import("node.zig");
const std = @import("std");
const clib = @cImport({
    @cDefine("struct__OSUnalignedU16", "uint16_t");
    @cDefine("struct__OSUnalignedU32", "uint32_t");
    @cDefine("struct__OSUnalignedU64", "uint64_t");
    @cInclude("sys/wait.h");
    @cInclude("unistd.h");
});
const util = @import("util.zig");

pub fn register(env: c.napi_env, exports: c.napi_value) !void {
    try node.registerFunction(env, exports, "fork_exec", fork_exec);
}

const Errors = error{ CWDError, ForkError, ExecError };

// {
//     exec_array: string[];
//     argv: string[];
//     envp: string[];
//     cwd: string;
//     p2cread: number;
//     p2cwrite: number;
//     c2pread: number;
//     c2pwrite: number;
//     errread: number;
//     errwrite: number;
//     errpipe_read: number;
//     errpipe_write: number;
// }
fn fork_exec(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const args = node.getArgv(env, info, 1) catch return null;
    const opts = args[0];
    return fork_exec1(env, opts) catch return null;
}

fn fork_exec1(env: c.napi_env, opts: c.napi_value) !c.napi_value {
    const exec_array = try node.getNamedProperty(env, opts, "exec_array", "exec_array field (a string[])");
    var exec_array_c = try node.valueToArrayOfStrings(env, exec_array, "exec_array");
    defer util.freeArrayOfStrings(exec_array_c);

    const argv = try node.getNamedProperty(env, opts, "argv", "argv field (a string[])");
    var argv_c = try node.valueToArrayOfStrings(env, argv, "argv");
    defer util.freeArrayOfStrings(argv_c);

    const envp = try node.getNamedProperty(env, opts, "envp", "envp field (a string[])");
    var envp_c = try node.valueToArrayOfStrings(env, envp, "envp");
    defer util.freeArrayOfStrings(envp_c);

    // TODO: what about utf-8 and unicode?
    const cwd = try node.getNamedProperty(env, opts, "cwd", "cwd field (a string)");
    var cwd_c = try node.valueToString(env, cwd, "current working directory");
    defer std.c.free(cwd_c);

    const pid = clib.fork();
    if (pid == -1) {
        // TODO: write to error pipe.
        node.throwErrno(env, "fork system call failed");
        return null;
    }
    if (pid != 0) {
        // parent -- we're done with everything we need to do here.
        // NOTE: the way python uses fork_exec is that even if all the
        // forks fail, we do NOT report an error directly.  Instead,
        // an error message is sent via a pipe.
        return try node.create_i32(env, pid, "pid");
    }

    // We're the child.
    try do_fork_exec(exec_array_c, argv_c, envp_c, cwd_c);
    // should never get here...
    return null;
}

fn do_fork_exec(exec_array: [*](?[*:0]u8), argv: [*](?[*:0]u8), envp: [*](?[*:0]u8), cwd: [*:0]u8) !void {
    // First off, change the working directory:
    if (node.strlen(cwd) > 0) {
        if (clib.chdir(cwd) != 0) {
            return Errors.CWDError;
        }
    }
    // TODO: bunch of stuff here regarding pipes and uid/gid.

    // Try each executable in turn:
    var i: usize = 0;
    while (exec_array[i] != null) : (i += 1) {
        // TODO: what about envp
        _ = envp;
        var ret = clib.execv(exec_array[i], argv);
        // If we're here, it didn't work.
        if (ret == -1) {
            // TODO: something...?
        }
    }
    // all failed
    return Errors.ExecError;
}

//
