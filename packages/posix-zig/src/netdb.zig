const c = @import("c.zig");
const node = @import("node.zig");
const netdb = @cImport(@cInclude("netdb.h"));
const std = @import("std");
const string = @cImport(@cInclude("string.h"));
const inet = @cImport(@cInclude("arpa/inet.h"));

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

fn gethostbyname(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 1) catch return null;
    var buf: [1024]u8 = undefined;
    node.stringFromValue(env, argv[0], "name", 1024, &buf) catch return null;
    const hostent: *netdb.hostent = netdb.gethostbyname(&buf) orelse {
        node.throwError(env, "gethostbyname system call return null pointer");
        return null;
    };
    return createHostent(env, hostent);
}

// struct hostent *gethostbyaddr(const void *addr, socklen_t len, int type);
//
// Usage: gethostbyaddr("64.233.187.99") or gethostbyaddr("2001:4860:4860::8888")
fn gethostbyaddr(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    var buf: [40]u8 = undefined;
    const argv = node.getArgv(env, info, 3) catch return null;
    node.stringFromValue(env, argv[0], "ip", buf.len, &buf) catch return null;
    var i: usize = 0;
    var v6: bool = false;
    while (buf[i] != 0) : (i += 1) {
        if (buf[i] == ':') {
            v6 = true;
            break;
        }
    }
    if (v6) {
        return gethostbyaddr_v6(env, @ptrCast([*:0]u8, &buf));
    } else {
        return gethostbyaddr_v4(env, @ptrCast([*:0]u8, &buf));
    }
}

fn gethostbyaddr_v4(env: c.napi_env, bufPtr: [*:0]u8) callconv(.C) c.napi_value {
    var addr = inet.inet_addr(bufPtr);
    const hostent: *netdb.hostent = netdb.gethostbyaddr(&addr, @sizeOf(@TypeOf(addr)), netdb.AF_INET) orelse {
        node.throwError(env, "gethostbyaddr_v4 system call returned null pointer");
        return null;
    };
    return createHostent(env, hostent);
}

fn gethostbyaddr_v6(env: c.napi_env, bufPtr: [*:0]u8) callconv(.C) c.napi_value {
    var addr: inet.in6_addr = undefined;
    switch (inet.inet_pton(netdb.AF_INET6, bufPtr, &addr)) {
        0 => {
            node.throwError(env, "gethostbyaddr_v6 -- character string does not represent a valid network address in the specified address family");
            return null;
        },
        -1 => {
            node.throwError(env, "gethostbyaddr_v6 -- address family is invalid");
            return null;
        },
        else => {},
    }
    const hostent: *netdb.hostent = netdb.gethostbyaddr(&addr, @sizeOf(@TypeOf(addr)), netdb.AF_INET6) orelse {
        node.throwError(env, "gethostbyaddr_v6 system call returned null pointer");
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
    if (hostent.h_addrtype != netdb.AF_INET and hostent.h_addrtype != netdb.AF_INET6) {
        node.throwError(env, "internal bug -- invalid h_addrtype");
        return null;
    }
    const h_addrtype = node.create_i32(env, hostent.h_addrtype, "h_addrtype") catch return null;

    node.setNamedProperty(env, object, "h_addrtype", h_addrtype, "") catch return null;

    // h_length
    const h_length = node.create_i32(env, hostent.h_length, "h_length") catch return null;
    node.setNamedProperty(env, object, "h_length", h_length, "") catch return null;

    // h_addr_list
    // how many addresses:
    var i: u32 = 0;
    while (hostent.h_addr_list[i] != null) : (i += 1) {}
    // convert them to node strings:
    var h_addr_list = node.createArray(env, i, "h_addr_list") catch return null;
    node.setNamedProperty(env, object, "h_addr_list", h_addr_list, "") catch return null;
    if (i > 0) {
        i -= 1;
        while (true) : (i -= 1) {
            var ip: c.napi_value = undefined;
            var dst: [40]u8 = undefined;
            if (inet.inet_ntop(hostent.h_addrtype, hostent.h_addr_list[i], &dst, dst.len) == null) {
                node.throwError(env, "error converting address to string");
                return null;
            }
            ip = node.createStringFromPtr(env, @ptrCast([*:0]u8, &dst), "converting ip adddress to string") catch return null;
            node.setElement(env, h_addr_list, i, ip, "error setting ip address in h_addr_list") catch return null;
            if (i == 0) break; // have to do this, since if i = 0 then i-=1 is 2^32-1, since i is unsigned!
        }
    }

    // h_aliases
    // how many aliases?
    i = 0;
    while (hostent.h_aliases[i] != null) : (i += 1) {}
    // convert them to node strings:
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
