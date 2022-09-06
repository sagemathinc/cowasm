// Important; make sure to compile on all supported architectures to make sure these are
// all available.
// To add new constants, define constants in a module (see how it is defined in netdb or unistd),
// then update setting NAMES and VALUES below.

const c = @import("c.zig");
const node = @import("node.zig");
const netdb = @import("netdb.zig");
const unistd = @import("unistd.zig");
const util = @import("util.zig");
const wait = @import("wait.zig");

const NAMES = netdb.constants.names ++ unistd.constants.names ++ wait.constants.names ++ util.constants.names;
const VALUES = getValues(netdb.constants) ++ getValues(unistd.constants) ++ getValues(wait.constants) ++ getValues(util.constants);

// You shouldn't have to change anything below.

pub fn register(env: c.napi_env, exports: c.napi_value) !void {
    try node.registerFunction(env, exports, "getConstants", getConstants);
}

fn getConstants(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    _ = info;
    var obj = node.createObject(env, "") catch return null;
    var i: usize = 0;
    for (NAMES) |name| {
        setConstant(env, obj, name, VALUES[i]) catch return null;
        i += 1;
    }
    return obj;
}

fn getValues(comptime constants: anytype) [constants.names.len]i32 {
    return _getValues(constants.c_import, constants.names.len, constants.names);
}

fn _getValues(comptime c_import: anytype, comptime len: usize, comptime names: [len][:0]const u8) [len]i32 {
    var x: [names.len]i32 = undefined;
    var i = 0;
    for (names) |constant| {
        x[i] = @field(c_import, constant);
        i += 1;
    }
    return x;
}

fn setConstant(env: c.napi_env, object: c.napi_value, key: [:0]const u8, value: i32) !void {
    var result: c.napi_value = undefined;
    if (c.napi_create_int32(env, value, &result) != c.napi_ok) {
        return node.throw(env, "error creating i32 constant");
    }
    if (c.napi_set_named_property(env, object, @ptrCast([*c]const u8, key), result) != c.napi_ok) {
        return node.throw(env, "error setting constant");
    }
}
