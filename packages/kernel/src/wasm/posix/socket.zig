pub fn keepalive() void {}
const std = @import("std");
const util = @import("util.zig");

// The upstream zig/wasi layer by default has a very badly crippled
// sockaddr struct defined with sa_data having size 0, so it is
// *impossible* to use.   Thus -- just for importing socket.h --
// we temporarily set __wasilibc_unmodified_upstream.  We patch
// cPython (Modules/socketmodule.h) and do the same thing there.
// The result is we get the
// non-WASI *normal* version of sockaddr. This is important to
// actually do both here and in cPython, since just attempting to
// cast, etc., is going to lead to random corruption.
const c = @cImport({
    @cDefine("__wasilibc_unmodified_upstream", "1");
    @cInclude("sys/socket.h");
    @cInclude("errno.h");
});

pub const constants = .{ .c_import = c, .names = [_][:0]const u8{ "EADDRINUSE", "EADDRNOTAVAIL", "EAFNOSUPPORT", "EALREADY", "ECONNREFUSED", "EFAULT", "EHOSTUNREACH", "EINPROGRESS", "EISCONN", "ENETDOWN", "ENETUNREACH", "ENOBUFS", "ENOTSOCK", "EOPNOTSUPP", "EPROTOTYPE", "ETIMEDOUT", "ECONNRESET", "ELOOP", "ENAMETOOLONG", "SHUT_RD", "SHUT_WR", "SHUT_RDWR", "MSG_OOB", "MSG_PEEK", "MSG_WAITALL", "MSG_DONTROUTE" } };

// sockaddr is this:   struct { sa_family: u16, sa_data: [14]u8 };

export fn recv_sockaddr_sa_family(sockaddr: *c.sockaddr) u16 {
    //  std.debug.print("sockaddr = {}\n", .{sockaddr});
    return sockaddr.sa_family;
}

// do NOT free the returned string - it's just a reference into sockaddr
export fn recv_sockaddr_sa_data(sockaddr: *c.sockaddr) [*]u8 {
    return &(sockaddr.sa_data);
}
