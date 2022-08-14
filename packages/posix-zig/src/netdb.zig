const c = @import("c.zig");
const node = @import("node.zig");
const netdb = @cImport(@cInclude("netdb.h"));
const std = @import("std");

pub fn register(env: c.napi_env, exports: c.napi_value) !void {
    try node.registerFunction(env, exports, "gethostbyname", gethostbyname);
}

// struct hostent *gethostbyname(const char *name);
// struct hostent
// {
//     char *h_name;       /* Official domain name of host */
//     char **h_aliases;   /* Null-terminated array of domain names */
//     int h_addrtype;     /* Host address type (AF_INET) */
//     int h_length;       /* Length of an address, in bytes */
//     char **h_addr_list;     /* Null-terminated array of in_addr structs */
// };
// struct in_addr
// {
//     unsigned int s_addr; /* Network byte order (big-endian) */
// };

const in_addr = struct { s_addr: u32 };

fn gethostbyname(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 1) catch return null;
    var buf: [1024]u8 = undefined;
    node.string_from_value(env, argv[0], "name", 1024, &buf) catch return null;
    const hostent: *netdb.hostent = netdb.gethostbyname(&buf) orelse {
        node.throwError(env, "error in gethostbyname");
        return null;
    };
    std.debug.print("host = {s}\n", .{hostent.h_name});
    std.debug.print("h_addrtype = {d}\n", .{hostent.h_addrtype});
    std.debug.print("h_length = {d}\n", .{hostent.h_length});
    var i: usize = 0;
    while (hostent.h_addr_list[i] != null) : (i += 1) {
        const addr: *in_addr = @ptrCast(*in_addr, @alignCast(@alignOf(*in_addr), hostent.h_addr_list[i]));
        std.debug.print("h_addr_list[{d}] = {d}\n", .{ i, addr.s_addr });
    }
    return null;
}
