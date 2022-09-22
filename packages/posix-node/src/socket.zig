const c = @import("c.zig");
const node = @import("node.zig");
const std = @import("std");
const clib = @cImport({
    @cInclude("sys/socket.h");
});

pub fn register(env: c.napi_env, exports: c.napi_value) !void {
    try node.registerFunction(env, exports, "socket", socket);
}

fn socket(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 3) catch return null;
    const family = node.i32FromValue(env, argv[0], "family") catch return null;
    const socktype = node.i32FromValue(env, argv[1], "socktype") catch return null;
    const protocol = node.i32FromValue(env, argv[2], "protocol") catch return null;

    const fd = clib.socket(family, socktype, protocol);
    if (fd == -1) {
        node.throwErrno(env, "error creating socket");
        return null;
    }
    return node.create_i32(env, fd, "fd") catch return null;
}
