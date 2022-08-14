const c = @import("c.zig");
const translate = @import("translate.zig");
const unistd = @cImport(@cInclude("unistd.h"));

pub fn ttyname(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    _ = info;
    const name = unistd.ttyname(1);
    return translate.create_string_from_ptr(env, name) catch return null;
}

