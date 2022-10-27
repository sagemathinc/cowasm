// Inspired by https://viewsourcecode.org/snaptoken/kilo/02.enteringRawMode.html

const c = @import("c.zig");
const node = @import("node.zig");
const std = @import("std");
const clib = @cImport({
    @cInclude("termios.h");
    @cInclude("stdlib.h");
    @cInclude("unistd.h");
    @cInclude("wchar.h");
    @cInclude("locale.h");
    @cInclude("fcntl.h");
});

pub const constants = .{
    .c_import = clib,
    .names = [_][:0]const u8{
        // c_iflag's:
        "IGNBRK",   "BRKINT",    "IGNPAR",
        "PARMRK",   "INPCK",     "ISTRIP",
        "INLCR",    "IGNCR",     "ICRNL",
        "IXON",     "IXANY",     "IXOFF",
        "IMAXBEL",  "IUTF8",
        // c_oflag's:
            "OPOST",
        "ONLCR",    "OCRNL",     "ONOCR",
        "ONLRET",   "OFILL",     "OFDEL",
        // c_cflag's:
        "CSIZE",    "CS5",       "CS6",
        "CS7",      "CS8",       "CSTOPB",
        "CREAD",    "PARENB",    "PARODD",
        "HUPCL",    "CLOCAL",
        // c_lflag's
           "ICANON",
        "ISIG",     "ECHO",      "ECHOE",
        "ECHOK",    "ECHONL",    "NOFLSH",
        "TOSTOP",   "IEXTEN",
        // optional_actions
           "TCOOFF",
        "TCOON",    "TCIOFF",    "TCION",
        "TCIFLUSH", "TCOFLUSH",  "TCIOFLUSH",
        "TCSANOW",  "TCSADRAIN", "TCSAFLUSH",
    },
};

pub fn register(env: c.napi_env, exports: c.napi_value) !void {
    try node.registerFunction(env, exports, "getChar", getChar);
    try node.registerFunction(env, exports, "enableRawInput", enableRawInput);
    try node.registerFunction(env, exports, "setEcho", setEcho);
    try node.registerFunction(env, exports, "makeStdinBlocking", makeStdinBlocking);
    try node.registerFunction(env, exports, "tcgetattr", tcgetattr);
    try node.registerFunction(env, exports, "tcsetattr", tcsetattr);
}

const Errors = error{ GetAttr, GetFlags, SetFlags, SetAttr, SetLocale };

fn tcsetattr(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 3) catch return null;
    const fd = node.i32FromValue(env, argv[0], "fd") catch return null;
    const optional_actions = node.i32FromValue(env, argv[1], "optional_actions") catch return null;
    const obj = argv[2];
    // Important: we first initialize tio with the current value, then set the supported
    // values.  This is important, since there are several non-supported fields, and setting
    // them to 0 will break everything.
    var tio: clib.termios = undefined;
    if (clib.tcgetattr(fd, &tio) != 0) {
        node.throwErrno(env, "tcgetattr - failed");
    }
    tio.c_iflag = node.u32_from_object(env, obj, "c_iflag") catch return null;
    tio.c_oflag = node.u32_from_object(env, obj, "c_oflag") catch return null;
    tio.c_cflag = node.u32_from_object(env, obj, "c_cflag") catch return null;
    tio.c_lflag = node.u32_from_object(env, obj, "c_lflag") catch return null;
    // std.debug.print("tcsetattr({d}, {d}, {})\n", .{ fd, optional_actions, tio });
    if (clib.tcsetattr(fd, optional_actions, &tio) != 0) {
        node.throwErrno(env, "tcsetattr - failed");
    }
    return null;
}

fn tcgetattr(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 1) catch return null;
    const fd = node.i32FromValue(env, argv[0], "fd") catch return null;
    var tio: clib.termios = undefined;
    if (clib.tcgetattr(fd, &tio) != 0) {
        node.throwErrno(env, "tcgetattr - failed");
    }
    // std.debug.print("tcgetattr({d})={}\n", .{ fd, tio });
    // TODO: This truncate worries me a bit below!
    var ret = node.createObject(env, "Termios") catch return null;
    node.set_named_property_to_u32(env, ret, "c_iflag", @truncate(u32, tio.c_iflag), "setting c_iflag") catch return null;
    node.set_named_property_to_u32(env, ret, "c_oflag", @truncate(u32, tio.c_oflag), "setting c_oflag") catch return null;
    node.set_named_property_to_u32(env, ret, "c_cflag", @truncate(u32, tio.c_cflag), "setting c_cflag") catch return null;
    node.set_named_property_to_u32(env, ret, "c_lflag", @truncate(u32, tio.c_lflag), "setting c_lflag") catch return null;
    return ret;
}

fn _makeStdinBlocking() Errors!void {
    var flags = clib.fcntl(clib.STDIN_FILENO, clib.F_GETFL, @intCast(c_int, 0));
    if (flags < 0) {
        return Errors.GetFlags;
    }
    if (clib.fcntl(clib.STDIN_FILENO, clib.F_SETFL, flags & ~(clib.O_NONBLOCK)) < 0) {
        return Errors.SetFlags;
    }
}

fn makeStdinBlocking(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    _ = info;
    _makeStdinBlocking() catch {
        node.throwErrno(env, "makeStdinBlocking - failed");
    };
    return null;
}

fn enableRawInput(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    _ = info;
    _enableRawInput() catch {
        node.throwErrno(env, "enableRawInput - failed");
    };
    return null;
}

// disables icanon for the terminal and enables the locale so
// we can read a single wide character using getChar below.
var enabled = false;
fn _enableRawInput() Errors!void {
    if (enabled) return;

    try _makeStdinBlocking();

    var raw: clib.termios = undefined;
    if (clib.tcgetattr(clib.STDIN_FILENO, &raw) != 0) {
        return Errors.GetAttr;
    }
    raw.c_lflag &= ~(@intCast(@TypeOf(raw.c_lflag), clib.ICANON));
    if (clib.tcsetattr(clib.STDIN_FILENO, clib.TCSAFLUSH, &raw) != 0) {
        return Errors.SetAttr;
    }

    // On Linux we need C.UTF-8 but it isn't available on MacOS.  On MacOS the
    // default "" is fine, but that doesn't work for me on Linux...
    // This concerns me.
    if (clib.setlocale(clib.LC_ALL, "C.UTF-8") == null) {
        if (clib.setlocale(clib.LC_ALL, "") == null) {
            return Errors.SetLocale;
        }
    }

    enabled = true;
}

fn setEcho(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 1) catch return null;
    const enable = node.valueToBool(env, argv[0], "missing true or false argument") catch return null;
    var raw: clib.termios = undefined;
    if (clib.tcgetattr(clib.STDIN_FILENO, &raw) != 0) {
        node.throwErrno(env, "setEcho - tcgetattr failed");
        return null;
    }
    if (enable) {
        raw.c_lflag |= @intCast(@TypeOf(raw.c_lflag), clib.ECHO);
    } else {
        raw.c_lflag &= ~(@intCast(@TypeOf(raw.c_lflag), clib.ECHO));
    }
    if (clib.tcsetattr(clib.STDIN_FILENO, clib.TCSAFLUSH, &raw) != 0) {
        node.throwErrno(env, "setEcho - tcsetattr failed");
        return null;
    }
    return null;
}

// Use getChar to do a blocking read of a character.  This supports wide characters
// (reading utf-8) in your locale.  This changes properties of stdin to
// different values than what Node.js supports!
fn getChar(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    _enableRawInput() catch {
        node.throwErrno(env, "getChar - failed to enable raw mode");
        return null;
    };
    _ = info;
    var buf: [10]u8 = undefined;
    const w: clib.wint_t = clib.getwchar();
    if (w == clib.WEOF) {
        node.throwErrno(env, "EOF");
        return null;
    }

    var w2: [2]clib.wchar_t = undefined;
    w2[0] = @intCast(@TypeOf(w2[0]), w);
    w2[1] = 0;

    const bytes = clib.wcstombs(&buf, &w2, buf.len);
    if (bytes == -1) {
        node.throwErrno(env, "failed to convert wide string to bytes");
        return null;
    }
    var result: c.napi_value = undefined;
    if (c.napi_create_string_utf8(env, @ptrCast([*c]const u8, &buf), bytes, &result) != c.napi_ok) {
        node.throwErrno(env, "error creating string in getChar");
        return null;
    }
    return result;
}
