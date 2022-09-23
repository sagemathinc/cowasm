const c = @import("c.zig");
const node = @import("node.zig");
const netdb = @cImport({
    @cDefine("struct__OSUnalignedU16", "uint16_t");
    @cDefine("struct__OSUnalignedU32", "uint32_t");
    @cDefine("struct__OSUnalignedU64", "uint64_t");
    @cInclude("netdb.h");
    @cInclude("arpa/inet.h");
});
const std = @import("std");
const string = @cImport(@cInclude("string.h"));

pub fn register(env: c.napi_env, exports: c.napi_value) !void {
    try node.registerFunction(env, exports, "gethostbyname", gethostbyname);
    try node.registerFunction(env, exports, "gethostbyaddr", gethostbyaddr);
    try node.registerFunction(env, exports, "_getaddrinfo", getaddrinfo);
    try node.registerFunction(env, exports, "gai_strerror", gai_strerror);
    try node.registerFunction(env, exports, "hstrerror", hstrerror);
}

pub const constants = .{
    .c_import = netdb,
    .names = [_][:0]const u8{
        "AF_UNSPEC", "AF_UNIX", "AF_LOCAL", "AF_INET", "AF_SNA", "AF_DECnet", "AF_APPLETALK", "AF_ROUTE", "AF_IPX", "AF_ISDN", "AF_INET6", "AF_MAX", // AF_= address format
        "AI_PASSIVE", "AI_CANONNAME", "AI_NUMERICHOST", "AI_V4MAPPED", "AI_ALL", "AI_ADDRCONFIG", "AI_NUMERICSERV", // AI = address info
        "EAI_BADFLAGS", "EAI_NONAME", "EAI_AGAIN", "EAI_FAIL", "EAI_FAMILY",     "EAI_SOCKTYPE", "EAI_SERVICE", "EAI_MEMORY", "EAI_SYSTEM", "EAI_OVERFLOW", // errors for the getaddrinfo function
        "SOCK_STREAM",  "SOCK_DGRAM", "SOCK_RAW",  "SOCK_RDM", "SOCK_SEQPACKET",
    },
};

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
        node.throwError(env, "gethostbyname system call returned a null pointer");
        return null;
    };
    return createHostent(env, hostent);
}

// struct hostent *gethostbyaddr(const void *addr, socklen_t len, int type);
//
// Usage: gethostbyaddr("64.233.187.99") or gethostbyaddr("2001:4860:4860::8888")
fn gethostbyaddr(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    var buf: [40]u8 = undefined;
    const argv = node.getArgv(env, info, 1) catch return null;
    node.stringFromValue(env, argv[0], "ip", 40, &buf) catch return null;
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
    var addr = netdb.inet_addr(bufPtr);
    const hostent: *netdb.hostent = netdb.gethostbyaddr(&addr, @sizeOf(@TypeOf(addr)), netdb.AF_INET) orelse {
        node.throwError(env, "gethostbyaddr system call returned a null pointer");
        return null;
    };
    return createHostent(env, hostent);
}

fn gethostbyaddr_v6(env: c.napi_env, bufPtr: [*:0]u8) callconv(.C) c.napi_value {
    var addr: netdb.in6_addr = undefined;
    switch (netdb.inet_pton(netdb.AF_INET6, bufPtr, &addr)) {
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
        node.throwError(env, "gethostbyaddr system call returned null pointer");
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
            if (netdb.inet_ntop(hostent.h_addrtype, hostent.h_addr_list[i], &dst, dst.len) == null) {
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

//////////////////////////
//       int getaddrinfo(const char *restrict node,
//                        const char *restrict service,
//                        const struct addrinfo *restrict hints,
//                        struct addrinfo **restrict res);
//      void freeaddrinfo(struct addrinfo *res);
//
//
// call like this:
//
//      getaddrinfo0(node:string, service:string, hint_flags:number, hint_family:number, hint_socktype:number, hint_protocol:number)
//
// all arguments must be given, though the hints can all be 0.  In index.ts
// we provide a nicer interface.

fn getaddrinfo(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 6) catch return null;
    var nodeName: [256]u8 = undefined; // domain names are limited to 253 chars
    node.stringFromValue(env, argv[0], "node", 256, &nodeName) catch return null;
    var service: [256]u8 = undefined; // these are really short, e.g., "ftp"
    node.stringFromValue(env, argv[1], "service", 256, &service) catch return null;
    const hint_flags = node.i32FromValue(env, argv[2], "hint_flags") catch return null;
    const hint_family = node.i32FromValue(env, argv[3], "hint_family") catch return null;
    const hint_socktype = node.i32FromValue(env, argv[4], "hint_socktype") catch return null;
    const hint_protocol = node.i32FromValue(env, argv[5], "hint_protocol") catch return null;

    const hints = netdb.addrinfo{ .ai_flags = hint_flags, .ai_family = hint_family, .ai_socktype = hint_socktype, .ai_protocol = hint_protocol, .ai_addrlen = 0, .ai_addr = 0, .ai_canonname = 0, .ai_next = 0 };
    var res: *netdb.addrinfo = undefined;
    const errcode = netdb.getaddrinfo(&nodeName, &service, &hints, @ptrCast([*c][*c]netdb.addrinfo, &res));
    if (errcode != 0) {
        node.throwErrorNumber(env, @ptrCast([*:0]const u8, netdb.gai_strerror(errcode)), errcode);
        return null;
    }
    const addrinfo = createAddrinfoArray(env, res);
    netdb.freeaddrinfo(res);
    return addrinfo;
}

// struct sockaddr {
// 	__uint8_t       sa_len;         /* total length */
// 	sa_family_t     sa_family;      /* [XSI] address family */
// 	char            sa_data[14];    /* [XSI] addr value (actually larger) */
// };
//
const sockaddr = struct { sa_len: u8, sa_family: u8, sa_data: [14]u8 };

fn createAddrinfoArray(env: c.napi_env, addrinfo: ?*netdb.addrinfo) c.napi_value {
    // determine the length of the linked list.
    var len: u32 = 0;
    var cur = addrinfo;
    while (cur != null) : (cur = (cur orelse unreachable).ai_next) {
        len += 1;
    }
    var array = node.createArray(env, len, "creating array to hold addrinfo objects") catch return null;
    cur = addrinfo;
    var index: u32 = 0;
    while (cur != null) : (cur = (cur orelse unreachable).ai_next) {
        const info = cur orelse unreachable;
        node.setElement(env, array, index, createAddrinfo(env, info), "copying data into array of addrinfo objects") catch return null;
        index += 1;
    }
    return array;
}

fn createAddrinfo(env: c.napi_env, addrinfo: *netdb.addrinfo) c.napi_value {
    var object = node.createObject(env, "") catch return null;
    const ai_flags = node.create_i32(env, addrinfo.ai_flags, "ai_flags") catch return null;
    node.setNamedProperty(env, object, "ai_flags", ai_flags, "") catch return null;

    const ai_family = node.create_i32(env, addrinfo.ai_family, "ai_family") catch return null;
    node.setNamedProperty(env, object, "ai_family", ai_family, "") catch return null;

    const ai_socktype = node.create_i32(env, addrinfo.ai_socktype, "ai_socktype") catch return null;
    node.setNamedProperty(env, object, "ai_socktype", ai_socktype, "") catch return null;

    const ai_protocol = node.create_i32(env, addrinfo.ai_protocol, "ai_protocol") catch return null;
    node.setNamedProperty(env, object, "ai_protocol", ai_protocol, "") catch return null;

    const ai_addrlen = node.create_u32(env, addrinfo.ai_addrlen, "ai_addrlen") catch return null;
    node.setNamedProperty(env, object, "ai_addrlen", ai_addrlen, "") catch return null;

    if (addrinfo.ai_canonname != null) {
        const ai_canonname = node.createStringFromPtr(env, addrinfo.ai_canonname, "ai_canonname") catch return null;
        node.setNamedProperty(env, object, "ai_canonname", ai_canonname, "") catch return null;
    }

    const ai_addr = @ptrCast(*sockaddr, addrinfo.ai_addr);
    const sa_len = node.create_u32(env, ai_addr.sa_len, "sockaddr.sa_len") catch return null;
    node.setNamedProperty(env, object, "sa_len", sa_len, "") catch return null;
    const sa_family = node.create_u32(env, ai_addr.sa_family, "sockaddr.sa_family") catch return null;
    node.setNamedProperty(env, object, "sa_family", sa_family, "") catch return null;

    // "The sa_len field contains the length of the sa_data field. " -- from some official docs on an IBM website that are
    // *DEFINITELY WRONG*.  I tried with both sa_len and sa_len - 2, and the latter
    // is definitely right.  There's just random extra noise otherwise.
    // Also, on Linux sa_len is not the length at all.  So I'm using addrinfo.ai_addrlen-2, which seems right everywhere.
    const sa_data = node.createBufferCopy(env, &ai_addr.sa_data, addrinfo.ai_addrlen - 2, "sa_data") catch return null;
    node.setNamedProperty(env, object, "sa_data", sa_data, "") catch return null;

    return object;
}

// const char *gai_strerror(int errcode);
fn gai_strerror(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 1) catch return null;
    const errcode = node.i32FromValue(env, argv[0], "errcode") catch return null;
    const err = netdb.gai_strerror(errcode) orelse {
        node.throwError(env, "invalid error code");
        return null;
    };
    return node.createStringFromPtr(env, err, "err") catch return null;
}

// const char *hstrerror(int err);
fn hstrerror(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 1) catch return null;
    const errcode = node.i32FromValue(env, argv[0], "errcode") catch return null;
    const err = netdb.hstrerror(errcode) orelse {
        node.throwError(env, "invalid error code");
        return null;
    };
    return node.createStringFromPtr(env, err, "err") catch return null;
}
