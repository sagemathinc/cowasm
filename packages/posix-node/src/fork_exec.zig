const c = @import("c.zig");
const node = @import("node.zig");
const std = @import("std");
const clib = @cImport({
    @cDefine("struct__OSUnalignedU16", "uint16_t");
    @cDefine("struct__OSUnalignedU32", "uint32_t");
    @cDefine("struct__OSUnalignedU64", "uint64_t");
    @cInclude("sys/wait.h");
});
const util = @import("util.zig");

pub fn register(env: c.napi_env, exports: c.napi_value) !void {
    try node.registerFunction(env, exports, "fork_exec", fork_exec);
}

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
    const exec_array = node.getNamedProperty(env, args[0], "exec_array", "exec_array field (a string[])") catch return null;
    var exec_array_length: u32 = undefined;
    if (c.napi_get_array_length(env, exec_array, &exec_array_length) != c.napi_ok) {
        node.throw(env, "exec_array must be array of strings (failed to get length)") catch return null;
    }
    var i: u32 = 0;
    while (i < exec_array_length) : (i += 1) {
        var result: c.napi_value = undefined;
        if (c.napi_get_element(env, exec_array, i, &result) != c.napi_ok) {
            node.throw(env, "exec_array must be array of strings (failed to get length)") catch return null;
        }
        var executable = node.valueToString(env, result, "element of exec_array") catch return null;
        defer std.c.free(executable);
        var pid = fork_exec1(env, executable, info) catch 0;
        if (pid != 0) {
            return node.create_i32(env, pid, "pid") catch return null;
        }
    }

    util.setErrno(util.errno.ENOENT);
    node.throwErrno(env, "error calling fork_exec");
    return null;
}

fn fork_exec1(env: c.napi_env, executable: [*:0]u8, info: c.napi_callback_info) !c_int {
    std.debug.print("fork_exec1: executable = {s}\n", .{executable});
    const args = try node.getArgv(env, info, 1);
    const opts = args[0];

    const argv = try node.getNamedProperty(env, opts, "argv", "argv field (a string[])");
    var argv_c = try node.valueToArrayOfStrings(env, argv, "argv");
    defer util.freeArrayOfStrings(argv_c);

    const envp = try node.getNamedProperty(env, opts, "envp", "envp field (a string[])");
    var envp_c = try node.valueToArrayOfStrings(env, envp, "envp");
    defer util.freeArrayOfStrings(envp_c);

    const cwd = try node.getNamedProperty(env, opts, "cwd", "cwd field (a string)");
    var cwd_c = try node.valueToString(env, cwd, "current working directory");
    defer std.c.free(cwd_c);
    return 0;
}

//
