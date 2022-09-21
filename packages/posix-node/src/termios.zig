// Inspired by https://viewsourcecode.org/snaptoken/kilo/02.enteringRawMode.html

const c = @import("c.zig");
const node = @import("node.zig");
const std = @import("std");
const clib = @cImport({
    @cInclude("termios.h");
    @cInclude("unistd.h");
});

pub fn register(env: c.napi_env, exports: c.napi_value) !void {
    try node.registerFunction(env, exports, "enableRawMode", enableRawMode);
    try node.registerFunction(env, exports, "getChar", getChar);
}

fn enableRawMode(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    _ = info;

    var raw: clib.termios = undefined;
    if (clib.tcgetattr(clib.STDIN_FILENO, &raw) != 0) {
        node.throwErrno(env, "error calling tcgetattr to get current termios state");
        return null;
    }
    raw.c_lflag &= ~(@intCast(@TypeOf(raw.c_lflag), clib.ECHO | clib.ICANON));
    if (clib.tcsetattr(clib.STDIN_FILENO, clib.TCSAFLUSH, &raw) != 0) {
        node.throwErrno(env, "error calling tcsetattr to set updated termios state");
        return null;
    }
    return null;
}

// Use this when you do NOT have an interactive session (e.g., in a script)
// and *after* calling enableRawMode.

fn getChar(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    _ = info;
    var buf: [2]u8 = undefined;
    buf[1] = 0;
    if (clib.read(clib.STDIN_FILENO, &buf[0], 1) != 1) {
        node.throwErrno(env, "error reading a character");
        return null;
    }
    return node.createStringFromPtr(env, @ptrCast([*:0]u8, &buf), "getChar character") catch return null;
}
