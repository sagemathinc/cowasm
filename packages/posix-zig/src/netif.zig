// Network interfaces

const c = @import("c.zig");
const node = @import("node.zig");
const net_if = @cImport(@cInclude("net/if.h"));

pub fn register(env: c.napi_env, exports: c.napi_value) !void {
    // if_freenameindex
    // if_indextoname
    // if_nameindex
    // if_nametoindex

    try node.registerFunction(env, exports, "if_indextoname", if_indextoname);
}

// char *if_indextoname(unsigned int ifindex, char *ifname);
fn if_indextoname(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    var ifname: [net_if.IFNAMSIZ]u8 = undefined;
    const argv = node.getArgv(env, info, 1) catch return null;
    const ifindex = node.u32FromValue(env, argv[0], "ifindex") catch return null;
    if (net_if.if_indextoname(ifindex, &ifname) == 0) {
        node.throwError(env, "invalid index");
        return null;
    }
    return node.createStringFromPtr(env, &ifname, "name") catch return null;
}
