pub fn keepalive() void {}
const std = @import("std");
const netdb = @cImport(@cInclude("netdb.h"));
const inet = @cImport(@cInclude("arpa/inet.h"));
const util = @import("util.zig");

export fn sendAddrinfo(ai_flags: c_int, ai_family: c_int, ai_socktype: c_int, ai_protocol: c_int, ai_addrlen: netdb.socklen_t, ai_addr: *netdb.sockaddr, ai_canonname: ?[*]u8, ai_next: ?*netdb.addrinfo) ?*netdb.addrinfo {
    const addrinfo = util.mallocType(netdb.addrinfo, "sendAddrinfo") orelse return null;
    addrinfo.ai_flags = ai_flags;
    addrinfo.ai_family = ai_family;
    addrinfo.ai_socktype = ai_socktype;
    addrinfo.ai_protocol = ai_protocol;
    addrinfo.ai_addrlen = ai_addrlen;
    addrinfo.ai_addr = ai_addr;
    addrinfo.ai_canonname = ai_canonname;
    addrinfo.ai_next = ai_next;
    return addrinfo;
}

// part of the posix api
export fn freeaddrinfo(addrinfo: *netdb.addrinfo) void {
    // This is complicated because it is a linked list, and
    // also some fields in it are pointers.
    if (addrinfo.ai_next != null) { // handle linked list part via recurssion (it is a small list)
        freeaddrinfo(addrinfo.ai_next);
    }
    if (addrinfo.ai_canonname != null) {
        std.c.free(addrinfo.ai_canonname);
    }
    std.c.free(addrinfo.ai_addr);
    std.c.free(addrinfo);
}

export fn recvAddr(addr: *anyopaque, addrtype: c_int) ?[*]u8 {
    const dst = util.mallocString(40, "recvAddr") orelse return null;
    if (inet.inet_ntop(addrtype, addr, dst, 40) == null) {
        std.debug.print("recvAddr -- failed to convert address to string via inet_ntop\n", .{});
        std.c.free(dst);
        return null;
    }
    return dst;
}

export fn sendHostent(h_name: [*:0]u8, h_aliases: [*c][*c]u8, h_addrtype: c_int, h_length: c_int, h_addr_list: [*c][*c]u8, h_addr_list_len: usize) ?*netdb.hostent {
    const hostent = util.mallocType(netdb.hostent, "sendHostent") orelse return null;
    hostent.h_name = h_name;
    hostent.h_aliases = h_aliases;
    hostent.h_addrtype = h_addrtype;
    hostent.h_length = h_length;
    var binary = if (h_addrtype == netdb.AF_INET) convert_h_addr_list_ToBinary_v4(h_addr_list, h_addr_list_len) else convert_h_addr_list_ToBinary_v6(h_addr_list, h_addr_list_len);
    hostent.h_addr_list = binary orelse return null;
    freeNullTerminatedArrayOfStrings(h_addr_list);
    return hostent;
}

fn freeNullTerminatedArrayOfStrings(v: [*c][*c]u8) void {
    var i: usize = 0;
    while (v[i] != null) : (i += 1) {
        std.c.free(v[i]);
    }
    std.c.free(@ptrCast(*anyopaque, v));
}

fn convert_h_addr_list_ToBinary_v4(h_addr_list: [*c][*c]u8, len: usize) ?[*c][*c]u8 {
    // Need to use
    //    int inet_pton(int af, const char *restrict src, void *restrict dst);
    // to convert the h_addr_list from text to binary form.
    var h_addr_binary_list = util.mallocArray(*allowzero netdb.in_addr, len + 1, "convert_h_addr_list_ToBinary_v4") orelse return null;
    var i: usize = 0;
    while (i < len) : (i += 1) {
        var dst = util.mallocType(netdb.in_addr, "allocating in_addr in convert_h_addr_list_ToBinary_v4") orelse return null;
        const ret = inet.inet_pton(netdb.AF_INET, h_addr_list[i], dst);
        if (ret != 1) {
            // TODO: slight memory leak here!
            std.debug.print("inet_pton failed when doing convert_h_addr_list_ToBinary_v4 - h_addr_list[{d}]='{s}', ret={d}\n", .{ i, h_addr_list[i], ret });
            return null;
        }
        h_addr_binary_list[i] = dst;
    }
    h_addr_binary_list[len] = @intToPtr(*allowzero netdb.in_addr, 0);
    return @ptrCast([*c][*c]u8, h_addr_binary_list);
}

fn convert_h_addr_list_ToBinary_v6(h_addr_list: [*c][*c]u8, len: usize) ?[*c][*c]u8 {
    var h_addr_binary_list = util.mallocArray(*allowzero netdb.in6_addr, len + 1, "convert_h_addr_list_ToBinary_v4") orelse return null;
    var i: usize = 0;
    while (i < len) : (i += 1) {
        var dst = util.mallocType(netdb.in6_addr, "allocating in_addr in convert_h_addr_list_ToBinary_v4") orelse return null;
        const ret = inet.inet_pton(netdb.AF_INET6, h_addr_list[i], dst);
        if (ret != 1) {
            // TODO: slight memory leak here!
            std.debug.print("inet_pton failed when doing convert_h_addr_list_ToBinary_v4 - h_addr_list[{d}]='{s}', ret={d}\n", .{ i, h_addr_list[i], ret });
            return null;
        }
        h_addr_binary_list[i] = dst;
    }
    h_addr_binary_list[len] = @intToPtr(*allowzero netdb.in6_addr, 0);
    return @ptrCast([*c][*c]u8, h_addr_binary_list);
}

pub const constants = [_][:0]const u8{
    "AF_UNSPEC", "AF_UNIX", "AF_INET", "AF_INET6", // AF_= address format
    "AI_PASSIVE", "AI_CANONNAME", "AI_NUMERICHOST", "AI_V4MAPPED", "AI_ALL", "AI_ADDRCONFIG", "AI_NUMERICSERV", // AI = address info
    "EAI_BADFLAGS", "EAI_NONAME", "EAI_AGAIN", "EAI_FAIL", "EAI_FAMILY", "EAI_SOCKTYPE", "EAI_SERVICE", "EAI_MEMORY", "EAI_SYSTEM", "EAI_OVERFLOW", // errors for the getaddrinfo function
};

pub const values = blk: {
    var x: [constants.len]i32 = undefined;
    var i = 0;
    for (constants) |constant| {
        x[i] = @field(netdb, constant);
        i += 1;
    }
    break :blk x;
};
