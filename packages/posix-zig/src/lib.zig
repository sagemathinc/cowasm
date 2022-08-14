const c = @import("c.zig");
const unistd = @import("unistd.zig");
const netdb = @import("netdb.zig");

export fn napi_register_module_v1(env: c.napi_env, exports: c.napi_value) c.napi_value {
    unistd.register(env, exports) catch return null;
    netdb.register(env, exports) catch return null;
    return exports;
}
