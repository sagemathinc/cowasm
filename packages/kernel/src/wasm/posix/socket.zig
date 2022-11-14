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

pub const constants = .{ .c_import = c, .names = [_][:0]const u8{ "EADDRINUSE", "EADDRNOTAVAIL", "EAFNOSUPPORT", "EAGAIN", "EALREADY", "ECONNREFUSED", "EFAULT", "EHOSTUNREACH", "EINPROGRESS", "EISCONN", "ENETDOWN", "ENETUNREACH", "ENOBUFS", "ENOTSOCK", "ENOPROTOOPT", "EOPNOTSUPP", "EPROTOTYPE", "ETIMEDOUT", "ECONNRESET", "ELOOP", "ENAMETOOLONG", "SHUT_RD", "SHUT_WR", "SHUT_RDWR", "MSG_OOB", "MSG_PEEK", "MSG_WAITALL", "MSG_DONTROUTE", "SO_ACCEPTCONN", "SO_ATTACH_BPF", "SO_ATTACH_FILTER", "SO_ATTACH_REUSEPORT_CBPF", "SO_ATTACH_REUSEPORT_EBPF", "SO_BINDTODEVICE", "SO_BINDTOIFINDEX", "SO_BPF_EXTENSIONS", "SO_BROADCAST", "SO_BSDCOMPAT", "SO_BUSY_POLL", "SO_CNX_ADVICE", "SO_COOKIE", "SO_DEBUG", "SO_DETACH_BPF", "SO_DETACH_FILTER", "SO_DETACH_REUSEPORT_BPF", "SO_DOMAIN", "SO_DONTROUTE", "SO_ERROR", "SO_GET_FILTER", "SO_INCOMING_CPU", "SO_INCOMING_NAPI_ID", "SO_KEEPALIVE", "SO_LINGER", "SO_LOCK_FILTER", "SO_MARK", "SO_MAX_PACING_RATE", "SO_MEMINFO", "SO_NOFCS", "SO_NO_CHECK", "SO_OOBINLINE", "SO_PASSCRED", "SO_PASSSEC", "SO_PEEK_OFF", "SO_PEERCRED", "SO_PEERGROUPS", "SO_PEERNAME", "SO_PEERSEC", "SO_PRIORITY", "SO_PROTOCOL", "SO_RCVBUF", "SO_RCVBUFFORCE", "SO_RCVLOWAT", "SO_RCVTIMEO", "SO_REUSEADDR", "SO_REUSEPORT", "SO_RXQ_OVFL", "SO_SECURITY_AUTHENTICATION", "SO_SECURITY_ENCRYPTION_NETWORK", "SO_SECURITY_ENCRYPTION_TRANSPORT", "SO_SELECT_ERR_QUEUE", "SO_SNDBUF", "SO_SNDBUFFORCE", "SO_SNDLOWAT", "SO_SNDTIMEO", "SO_TIMESTAMP", "SO_TIMESTAMPING", "SO_TIMESTAMPNS", "SO_TXTIME", "SO_TYPE", "SO_WIFI_STATUS", "SO_ZEROCOPY", "SOL_SOCKET" } };

// sockaddr is this:   struct { sa_family: u16, sa_data: [14]u8 };

export fn recv_sockaddr_sa_family(sockaddr: *c.sockaddr) u16 {
    //  std.debug.print("sockaddr = {}\n", .{sockaddr});
    return sockaddr.sa_family;
}

// do NOT free the returned string - it's just a reference into sockaddr
export fn recv_sockaddr_sa_data(sockaddr: *c.sockaddr) [*]u8 {
    return &(sockaddr.sa_data);
}
