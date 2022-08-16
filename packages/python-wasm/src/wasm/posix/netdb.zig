pub fn keepalive() void {}
const std = @import("std");
const netdb = @cImport(@cInclude("netdb.h"));
const inet = @cImport(@cInclude("arpa/inet.h"));

fn mallocType(comptime T: type, comptime errorMesg: [:0]const u8) ?*T {
    var ptr = std.c.malloc(@sizeOf(T)) orelse {
        std.debug.print("failed to allocate space for object " ++ errorMesg, .{});
        return null;
    };
    return @ptrCast(*T, @alignCast(std.meta.alignment(*T), ptr));
}

fn mallocArray(comptime T: type, len: usize, comptime errorMesg: [:0]const u8) ?[*]T {
    var ptr = std.c.malloc(@sizeOf(T) * len) orelse {
        std.debug.print("failed to allocate space for array " ++ errorMesg, .{});
        return null;
    };
    return @ptrCast([*]T, @alignCast(std.meta.alignment([*]T), ptr));
}

fn mallocString(n: usize, comptime errorMesg: [:0]const u8) ?[*]u8 {
    return @ptrCast([*]u8, std.c.malloc(n) orelse {
        std.debug.print("failed to allocate space for string " ++ errorMesg, .{});
        return null;
    });
}

export fn sendAddrinfo(ai_flags: c_int, ai_family: c_int, ai_socktype: c_int, ai_protocol: c_int, ai_addrlen: netdb.socklen_t, ai_addr: *netdb.sockaddr, ai_canonname: ?[*]u8, ai_next: ?*netdb.addrinfo) ?*netdb.addrinfo {
    const addrinfo = mallocType(netdb.addrinfo, "sendAddrinfo") orelse return null;
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
    const dst = mallocString(40, "recvAddr") orelse return null;
    if (inet.inet_ntop(addrtype, addr, dst, 40) == null) {
        std.debug.print("recvAddr -- failed to convert address to string via inet_ntop\n", .{});
        std.c.free(dst);
        return null;
    }
    return dst;
}

export fn sendHostent(h_name: [*:0]u8, h_aliases: [*c][*c]u8, h_addrtype: c_int, h_length: c_int, h_addr_list: [*c][*c]u8) ?*netdb.hostent {
    std.debug.print("sendHostent {s}\n", .{h_name});
    const hostent = mallocType(netdb.hostent, "sendHostent") orelse return null;
    hostent.h_name = h_name;
    hostent.h_aliases = h_aliases;
    hostent.h_addrtype = h_addrtype;
    hostent.h_length = h_length;
    //hostent.h_addr_list = (if (h_addrtype == netdb.AF_INET) convert_h_addr_list_ToBinary_v4(h_addr_list, h_length) else convert_h_addr_list_ToBinary_v6(h_addr_list, h_length)) orelse return null;
    hostent.h_addr_list = @ptrCast([*c][*c]u8, convert_h_addr_list_ToBinary_v4(h_addr_list, @intCast(usize, h_length)) orelse return null);
    // TODO: free h_addr_list.
    return hostent;
}

fn convert_h_addr_list_ToBinary_v4(h_addr_list: [*c][*c]u8, len: usize) ?[*]*allowzero netdb.in_addr {
    // Need to use
    //    int inet_pton(int af, const char *restrict src, void *restrict dst);
    // to convert the h_addr_list from text to binary form.
    var h_addr_binary_list = mallocArray(*allowzero netdb.in_addr, len + 1, "convert_h_addr_list_ToBinary_v4") orelse return null;
    var i: usize = 0;
    while (i < len) : (i += 1) {
        var dst = mallocType(netdb.in_addr, "allocating in_addr in convert_h_addr_list_ToBinary_v4") orelse return null;
        const ret = inet.inet_pton(netdb.AF_INET, h_addr_list[i], dst);
        if (ret != 1) {
            // TODO: slight memory leak here!
            std.debug.print("inet_pton failed when doing convert_h_addr_list_ToBinary_v4 - ret={d}\n", .{ret});
            return null;
        }
        h_addr_binary_list[i] = dst;
    }
    h_addr_binary_list[len] = @intToPtr(*allowzero netdb.in_addr, 0);
    return h_addr_binary_list;
}
