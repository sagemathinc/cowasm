const c = @import("c.zig");
const translate = @import("translate.zig");
const unistd = @cImport(@cInclude("unistd.h"));

pub fn ttyname(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    var argv: [2]c.napi_value = undefined;
    var argc: usize = 1;
    const status = c.napi_get_cb_info(env, info, &argc, &argv, null, null);
    if (status != c.napi_ok) {
        return null;
    }
    const fd = translate.i32_from_value(env, argv[0], "fd") catch return null;
    const name = unistd.ttyname(fd);
    if (name == null) {
        translate.throw(env, "invalid file descriptor") catch return null;
        return null;
    }
    return translate.create_string_from_ptr(env, name) catch return null;
}
