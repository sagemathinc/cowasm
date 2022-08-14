const std = @import("std");
const assert = std.debug.assert;
const c = @import("c.zig");
const translate = @import("translate.zig");
const unistd = @import("unistd.zig");

export fn napi_register_module_v1(env: c.napi_env, exports: c.napi_value) c.napi_value {
    unistd.register(env, exports) catch return null;
    return exports;
}
