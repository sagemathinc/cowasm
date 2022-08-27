const c = @import("c.zig");
const constants = @import("constants.zig");
const netdb = @import("netdb.zig");
const netif = @import("netif.zig");
const other = @import("other.zig");
const unistd = @import("unistd.zig");
const builtin = @import("builtin");

export fn napi_register_module_v1(env: c.napi_env, exports: c.napi_value) c.napi_value {
    constants.register(env, exports) catch return null;
    netdb.register(env, exports) catch return null;
    netif.register(env, exports) catch return null;
    other.register(env, exports) catch return null;
    unistd.register(env, exports) catch return null;
    if (builtin.target.os.tag == .linux) {
        const linux = @import("linux.zig");
        linux.register(env, exports) catch return null;
    }
    return exports;
}
