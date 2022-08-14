const c = @import("c.zig");
const node = @import("node.zig");
const netdb = @cImport(@cInclude("netdb.h"));
const std = @import("std");

pub fn register(env: c.napi_env, exports: c.napi_value) !void {
    try node.registerFunction(env, exports, "gethostbyname", gethostbyname);
    try node.registerFunction(env, exports, "gethostbyaddr", gethostbyaddr);
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
    return createHostent(env, hostent);
}

fn createHostent(env: c.napi_env, hostent: *netdb.hostent) c.napi_value {
    var object = node.createObject(env, "") catch return null;

    // h_name
    const h_name = node.createStringFromPtr(env, hostent.h_name, "hostent.h_name") catch return null;
    node.setNamedProperty(env, object, "h_name", h_name, "") catch return null;

    // h_addrtype
    const h_addrtype = node.create_i32(env, hostent.h_addrtype, "h_addrtype") catch return null;
    node.setNamedProperty(env, object, "h_addrtype", h_addrtype, "") catch return null;

    // h_length
    if (hostent.h_length != 4) {
        // we are only implementing support for ipv4 (?).
        node.throwError(env, "TODO: gethostbyname only implemented for ipv4 h_length = 4");
        return null;
    }
    const h_length = node.create_i32(env, hostent.h_length, "h_length") catch return null;
    node.setNamedProperty(env, object, "h_length", h_length, "") catch return null;

    // h_addr_list
    // how many addresses?
    var i: u32 = 0;
    while (hostent.h_addr_list[i] != null) : (i += 1) {}
    var h_addr_list = node.createArray(env, i, "h_addr_list") catch return null;
    node.setNamedProperty(env, object, "h_addr_list", h_addr_list, "") catch return null;
    if (i > 0) {
        i -= 1;
        while (true) : (i -= 1) {
            const addr: *in_addr = @ptrCast(*in_addr, @alignCast(@alignOf(*in_addr), hostent.h_addr_list[i]));
            const ip = node.create_u32(env, addr.s_addr, "ip address") catch return null;
            node.setElement(env, h_addr_list, i, ip, "error setting ip address in h_addr_list") catch return null;
            if (i == 0) break; // have to do this, since if i = 0 then i-=1 is 2^32-1, since i is unsigned!
        }
    }

    // h_aliases
    // how many aliases?
    i = 0;
    while (hostent.h_aliases[i] != null) : (i += 1) {}
    var h_aliases = node.createArray(env, i, "h_aliases") catch return null;
    node.setNamedProperty(env, object, "h_aliases", h_aliases, "") catch return null;
    if (i > 0) {
        i -= 1;
        while (true) : (i -= 1) {
            const alias = node.createStringFromPtr(env, hostent.h_aliases[i], "h_aliases[i]") catch return null;
            node.setElement(env, h_aliases, i, alias, "error setting alias in h_aliases") catch return null;
            if (i == 0) break;
        }
    }
    return object;
}

// struct hostent *gethostbyaddr(const void *addr, socklen_t len, int type);

fn gethostbyaddr(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    _ = env;
    _ = info;
    return null;
}
