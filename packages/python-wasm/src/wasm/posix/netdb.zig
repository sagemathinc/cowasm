pub fn keepalive() void {}
const std = @import("std");
const netdb = @cImport(@cInclude("netdb.h"));

export fn sendAddrinfo(ai_flags: c_int, ai_family: c_int, ai_socktype: c_int, ai_protocol: c_int, ai_addrlen: netdb.socklen_t, ai_addr: *netdb.sockaddr, ai_canonname: ?[*]u8, ai_next: ?*netdb.addrinfo) ?*netdb.addrinfo {
    var ptr = std.c.malloc(@sizeOf(netdb.addrinfo)) orelse {
        return null;
    };
    var addrinfo = @ptrCast(*netdb.addrinfo, @alignCast(std.meta.alignment(*netdb.addrinfo), ptr));
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
