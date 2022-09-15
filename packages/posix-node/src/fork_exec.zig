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
    _ = info;
    util.setErrno(util.errno.ENOENT);
    node.throwErrno(env, "error calling fork_exec");
    return null;
}
