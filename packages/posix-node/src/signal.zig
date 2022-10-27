const c = @import("c.zig");
const node = @import("node.zig");
const std = @import("std");
const signal = @cImport({
    @cInclude("signal.h");
});

pub const constants = .{
    .c_import = signal,
    .names = [_][:0]const u8{"SIGINT"},
};

pub fn register(env: c.napi_env, exports: c.napi_value) !void {
    try node.registerFunction(env, exports, "watchForSignal", watchForSignal);
    try node.registerFunction(env, exports, "getSignalState", getSignalState);
}

var sigintState: bool = false;
fn handleSigint(sig: c_int) callconv(.C) void {
    _ = sig;
    // std.debug.print("Caught signal {}\n", .{sig});
    sigintState = true;
}

fn watchForSignal(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 1) catch return null;
    const whichSignal = node.i32FromValue(env, argv[0], "signal") catch return null;
    if (whichSignal != signal.SIGINT) {
        node.throwErrno(env, "only SIGINT is currently supported");
        return null;
    }

    const r = signal.signal(signal.SIGINT, handleSigint);
    _ = r;
    // clib returns -1 via some scary casts into a pointer to indicate an error, and
    // zig is not so happy with that.
    //     if (r ==-1) {
    //         node.throwErrno(env, "error setting SIGINT handler");
    //         return null;
    //     }

    return null;
}

fn getSignalState(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    _ = info;
    const state = node.create_bool(env, sigintState, "signal state") catch return null;
    sigintState = false;
    return state;
}
