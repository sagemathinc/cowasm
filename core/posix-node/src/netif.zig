// Network interfaces

const c = @import("c.zig");
const node = @import("node.zig");
const net_if = @cImport({
    @cDefine("struct__OSUnalignedU16", "uint16_t");
    @cDefine("struct__OSUnalignedU32", "uint32_t");
    @cDefine("struct__OSUnalignedU64", "uint64_t");
    @cInclude("net/if.h");
});

pub fn register(env: c.napi_env, exports: c.napi_value) !void {
    // if_indextoname
    // if_nameindex
    // if_nametoindex

    try node.registerFunction(env, exports, "if_indextoname", if_indextoname);
    try node.registerFunction(env, exports, "if_nametoindex", if_nametoindex);
    try node.registerFunction(env, exports, "if_nameindex", if_nameindex);
}

// char *if_indextoname(unsigned int ifindex, char *ifname);
fn if_indextoname(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    var ifname: [net_if.IFNAMSIZ:0]u8 = undefined;
    const argv = node.getArgv(env, info, 1) catch return null;
    const ifindex = node.u32FromValue(env, argv[0], "ifindex") catch return null;
    if (net_if.if_indextoname(ifindex, &ifname) == 0) {
        node.throwError(env, "invalid index");
        return null;
    }
    return node.createStringFromPtr(env, &ifname, "name") catch return null;
}

// unsigned int if_nametoindex(const char *ifname);
fn if_nametoindex(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    var ifname: [net_if.IFNAMSIZ]u8 = undefined;
    const argv = node.getArgv(env, info, 1) catch return null;
    node.stringFromValue(env, argv[0], "ifname", net_if.IFNAMSIZ, &ifname) catch return null;
    const ifindex = net_if.if_nametoindex(&ifname);
    if (ifindex == 0) {
        node.throwError(env, "interface ifname does not exist");
        return null;
    }
    return node.create_u32(env, ifindex, "ifindex") catch return null;
}

// struct if_nameindex *if_nameindex(void);
fn if_nameindex(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    _ = info;
    var nameindex = net_if.if_nameindex();
    var i: usize = 0;
    while (nameindex[i].if_index != 0) : (i += 1) {}

    const array = node.createArray(env, @intCast(u32, i), "if_nameindex output array") catch return null;
    i -= 1;
    while (i >= 0) : (i -= 1) {
        const entry = node.createArray(env, 2, "if_nameindex element") catch return null;
        const index = node.create_u32(env, nameindex[i].if_index, "index") catch return null;
        node.setElement(env, entry, 0, index, "setting index of entry in if_nameindex") catch return null;
        const name = node.createStringFromPtr(env, nameindex[i].if_name, "name") catch return null;
        node.setElement(env, entry, 1, name, "setting name of entry in if_nameindex") catch return null;
        node.setElement(env, array, @intCast(u32, i), entry, "setting entry of if_nameindex array") catch return null;
        if (i == 0) break; // unsigned so avoid wrap around
    }
    return array;
}
