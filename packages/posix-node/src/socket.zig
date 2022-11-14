const c = @import("c.zig");
const node = @import("node.zig");
const std = @import("std");
const clib = @cImport({
    @cInclude("sys/socket.h");
    @cInclude("errno.h");
    @cInclude("netdb.h");
    @cInclude("poll.h");
});
const builtin = @import("builtin");

pub const constants = .{
    .c_import = clib,
    .names = [_][:0]const u8{ "EADDRINUSE", "EADDRNOTAVAIL", "EAFNOSUPPORT", "EAGAIN", "EALREADY", "ECONNREFUSED", "EFAULT", "EHOSTUNREACH", "EINPROGRESS", "EISCONN", "ENETDOWN", "ENETUNREACH", "ENOBUFS", "ENOTSOCK", "ENOPROTOOPT", "EOPNOTSUPP", "EPROTOTYPE", "ETIMEDOUT", "ECONNRESET", "ELOOP", "ENAMETOOLONG", "SHUT_RD", "SHUT_WR", "SHUT_RDWR", "MSG_OOB", "MSG_PEEK", "MSG_WAITALL", "MSG_DONTROUTE", "SO_ACCEPTCONN", "SO_BROADCAST", "SO_DEBUG", "SO_DONTROUTE", "SO_ERROR", "SO_KEEPALIVE", "SO_LINGER", "SO_OOBINLINE", "SO_RCVBUF", "SO_RCVLOWAT", "SO_RCVTIMEO", "SO_REUSEADDR", "SO_REUSEPORT", "SO_SNDBUF", "SO_SNDLOWAT", "SO_SNDTIMEO", "SO_TIMESTAMP", "SO_TYPE", "SOL_SOCKET" },
};

pub fn register(env: c.napi_env, exports: c.napi_value) !void {
    try node.registerFunction(env, exports, "accept", accept);
    try node.registerFunction(env, exports, "_bind", bind);
    try node.registerFunction(env, exports, "_connect", connect);
    try node.registerFunction(env, exports, "getsockname", getsockname);
    try node.registerFunction(env, exports, "getpeername", getpeername);
    try node.registerFunction(env, exports, "listen", listen);
    try node.registerFunction(env, exports, "recv", recv);
    try node.registerFunction(env, exports, "send", send);
    try node.registerFunction(env, exports, "shutdown", shutdown);
    try node.registerFunction(env, exports, "socket", socket);
    try node.registerFunction(env, exports, "getsockopt", getsockopt);
    try node.registerFunction(env, exports, "setsockopt", setsockopt);
    try node.registerFunction(env, exports, "pollSocket", pollSocket);
}

fn socket(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 3) catch return null;
    const family = node.i32FromValue(env, argv[0], "family") catch return null;
    const socktype = node.i32FromValue(env, argv[1], "socktype") catch return null;
    const protocol = node.i32FromValue(env, argv[2], "protocol") catch return null;

    const fd = clib.socket(family, socktype, protocol);
    if (fd == -1) {
        node.throwErrno(env, "error creating socket");
        return null;
    }
    return node.create_i32(env, fd, "fd") catch return null;
}

// int bind(int socket, const struct sockaddr *address, socklen_t address_len);
// bind: (socket: number, sa_len:number, sa_family:number, sa_data:Buffer) => void;

fn bind(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 4) catch return null;
    const socket_fd = node.i32FromValue(env, argv[0], "socket") catch return null;
    const sa_len = node.i32FromValue(env, argv[1], "sa_len") catch return null;
    const sa_family = node.i32FromValue(env, argv[2], "sa_family") catch return null;

    var sa_data: [*]u8 = undefined;
    var dummy: usize = undefined;
    if (c.napi_get_buffer_info(env, argv[3], @ptrCast([*c]?*anyopaque, &sa_data), &dummy) != c.napi_ok) {
        node.throwErrno(env, "error reading sa_data");
        return null;
    }

    var sockaddr: clib.sockaddr = undefined;
    sockaddr.sa_data = sa_data[0..14].*; // TODO: I'm dubious!  Maybe just for ipv4?
    if (builtin.target.os.tag != .linux) {
        sockaddr.sa_len = @intCast(u8, sa_len);
    }
    sockaddr.sa_family = @intCast(u8, sa_family);

    // std.debug.print("calling bind(socket_fd={}, sockaddr={}, sa_length={})\n", .{ socket_fd, sockaddr, @sizeOf(clib.sockaddr) });
    const fd = clib.bind(socket_fd, &sockaddr, @sizeOf(clib.sockaddr));
    if (fd == -1) {
        node.throwErrno(env, "error calling bind");
        return null;
    }
    return null;
}

fn connect(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 4) catch return null;
    const socket_fd = node.i32FromValue(env, argv[0], "socket") catch return null;
    const sa_len = node.i32FromValue(env, argv[1], "sa_len") catch return null;
    const sa_family = node.i32FromValue(env, argv[2], "sa_family") catch return null;

    var sa_data: [*]u8 = undefined;
    var dummy: usize = undefined;
    if (c.napi_get_buffer_info(env, argv[3], @ptrCast([*c]?*anyopaque, &sa_data), &dummy) != c.napi_ok) {
        node.throwErrno(env, "error reading sa_data");
        return null;
    }

    // std.debug.print("dummy = {}\n", .{dummy});
    var sockaddr: clib.sockaddr = undefined;
    // TODO: This is only for ipv4.  I haven't been able to do this properly for ipv6, where
    // dummy is 30 instead, because it violates what the C header says, and zig really doesn't
    // like this.  ipv6 painfully abuses C in a way that zig doesn't agree with.  I may
    // need some separate C code for this or maybe a #define in cInclude?
    sockaddr.sa_data = sa_data[0..14].*;
    if (builtin.target.os.tag != .linux) {
        sockaddr.sa_len = @intCast(u8, sa_len);
    }
    sockaddr.sa_family = @intCast(u8, sa_family);

    // std.debug.print("calling connect(socket_fd={}, sockaddr={}, sa_length={})\n", .{ socket_fd, sockaddr, @sizeOf(clib.sockaddr) });
    const fd = clib.connect(socket_fd, &sockaddr, @sizeOf(clib.sockaddr));
    if (fd == -1) {
        node.throwErrno(env, "error calling connect");
        return null;
    }
    return null;
}

// I found this useful during debugging and development, just to see what's in these structs on a native system:

// fn testit() void {
//     var hints: clib.addrinfo = clib.addrinfo{ .ai_flags = 0, .ai_family = clib.AF_UNSPEC, .ai_socktype = clib.SOCK_STREAM, .ai_protocol = 0, .ai_addrlen = 0, .ai_addr = 0, .ai_canonname = 0, .ai_next = 0 };
//     var res: ?*clib.addrinfo = null;
//     //clib.memset(&hints, 0, @sizeOf(clib.addrinfo));

//     if (clib.getaddrinfo("127.0.0.1", "2000", &hints, &res) != 0) {
//         std.debug.print("Error getting addr info\n", .{});
//     } else {
//         if (res) |res2| {
//             std.debug.print("Got res = {}\n", .{res2.ai_addr.*});
//         }
//     }
// }

// int getsockname(int sockfd, void* addr, socklen_t* addrlen);

fn getsockname(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 1) catch return null;
    const socket_fd = node.i32FromValue(env, argv[0], "socket") catch return null;

    var sockaddr: clib.sockaddr = undefined;
    var addrlen: clib.socklen_t = @sizeOf(clib.sockaddr);
    const r = clib.getsockname(socket_fd, &sockaddr, &addrlen);
    if (r != 0) {
        node.throwErrno(env, "error calling getsockname");
        return null;
    }
    // std.debug.print("getsockname: sockaddr = {}, addrlen = {}\n", .{ sockaddr, addrlen });
    return createSockaddr(env, &sockaddr, addrlen);
}

// Extract everything out of sockaddr and addrlen to make a Sockaddr Javascript object
fn createSockaddr(env: c.napi_env, sockaddr: *clib.sockaddr, addrlen: clib.socklen_t) c.napi_value {
    var object = node.createObject(env, "") catch return null;
    // sa_len
    const sa_len = node.create_u32(env, addrlen, "sa_len") catch return null;
    node.setNamedProperty(env, object, "sa_len", sa_len, "setting sa_len") catch return null;

    const sa_family = node.create_i32(env, sockaddr.sa_family, "sa_family") catch return null;
    node.setNamedProperty(env, object, "sa_family", sa_family, "setting sa_family") catch return null;

    const sa_data = node.createBufferCopy(env, &sockaddr.sa_data, addrlen - 2, "sa_data") catch return null;
    node.setNamedProperty(env, object, "sa_data", sa_data, "setting sa_data") catch return null;
    return object;
}

// int getpeername(int sockfd, void* addr, socklen_t* addrlen);

fn getpeername(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 1) catch return null;
    const socket_fd = node.i32FromValue(env, argv[0], "socket") catch return null;

    var sockaddr: clib.sockaddr = undefined;
    var addrlen: clib.socklen_t = @sizeOf(clib.sockaddr);
    const r = clib.getpeername(socket_fd, &sockaddr, &addrlen);
    if (r != 0) {
        node.throwErrno(env, "error calling getpeername");
        return null;
    }
    // std.debug.print("getpeername: sockaddr = {}, addrlen = {}\n", .{ sockaddr, addrlen });
    return createSockaddr(env, &sockaddr, addrlen);
}

// NOTE: for recv, the buffer get writtens to directly, so the client can
// make things efficient (or not) however they want, and we don't malloc or free.

// ssize_t recv(int socket, void *buffer, size_t length, int flags);
//   recv: (socket: number, buffer:Buffer, flags: number) => void;
fn recv(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 3) catch return null;
    const socket_fd = node.i32FromValue(env, argv[0], "socket_fd") catch return null;
    const flags = node.i32FromValue(env, argv[2], "flags") catch return null;

    var buffer: [*]u8 = undefined;
    var length: usize = undefined;
    if (c.napi_get_buffer_info(env, argv[1], @ptrCast([*c]?*anyopaque, &buffer), &length) != c.napi_ok) {
        node.throwErrno(env, "error reading buffer");
        return null;
    }
    // Receive the data.
    // std.debug.print("socket_fd={}, buffer={*}, length={}, flags={}\n", .{ socket_fd, buffer, length, flags });
    const bytes_received = clib.recv(socket_fd, buffer, length, flags);
    if (bytes_received < 0) {
        node.throwErrno(env, "error receiving data from socket");
        return null;
    }
    return node.create_i32(env, @intCast(i32, bytes_received), "bytes received") catch return null;
}

// ssize_t send(int socket, void *buffer, size_t length, int flags);
//   send: (socket: number, buffer: Buffer, flags: number) => number;
fn send(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 3) catch return null;
    const socket_fd = node.i32FromValue(env, argv[0], "socket_fd") catch return null;
    const flags = node.i32FromValue(env, argv[2], "flags") catch return null;

    var buffer: [*]u8 = undefined;
    var length: usize = undefined;
    if (c.napi_get_buffer_info(env, argv[1], @ptrCast([*c]?*anyopaque, &buffer), &length) != c.napi_ok) {
        node.throwErrno(env, "error reading buffer");
        return null;
    }
    // Send the data.
    const bytes_sent = clib.send(socket_fd, buffer, length, flags);
    if (bytes_sent < 0) {
        node.throwErrno(env, "error sending data to socket");
        return null;
    }

    return node.create_i32(env, @intCast(i32, bytes_sent), "bytes sent") catch return null;
}

// int shutdown(int socket, int how);
fn shutdown(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 2) catch return null;
    const socket_fd = node.i32FromValue(env, argv[0], "socket_fd") catch return null;
    const how = node.i32FromValue(env, argv[1], "how") catch return null;
    const r = clib.shutdown(socket_fd, how);
    if (r != 0) {
        node.throwErrno(env, "error calling shutdown on network socket");
    }
    return null;
}

// int listen(int socket, int backlog);
fn listen(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 2) catch return null;
    const socket_fd = node.i32FromValue(env, argv[0], "socket_fd") catch return null;
    const backlog = node.i32FromValue(env, argv[1], "backlog") catch return null;
    const r = clib.listen(socket_fd, backlog);
    if (r != 0) {
        node.throwErrno(env, "error calling listen on network socket");
    }
    return null;
}

// int accept(int socket, struct sockaddr *address, socklen_t *address_len);
// accept: (socket: number) => { fd: number; sockaddr: Sockaddr };
fn accept(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 1) catch return null;
    const socket_fd = node.i32FromValue(env, argv[0], "socket_fd") catch return null;

    var sockaddr: clib.sockaddr = undefined;
    // NOTE: On linux it's required that addrlen be initialized with
    // the size of sockaddr, but on macOS it isn't.
    var addrlen: clib.socklen_t = @sizeOf(clib.sockaddr);
    // std.debug.print("accept(socket_fd={}, sockaddr={*}, addrlen={*})\n", .{ socket_fd, &sockaddr, &addrlen });
    const fd = clib.accept(socket_fd, &sockaddr, &addrlen);
    if (fd == -1) {
        // std.debug.print("calling accept on socket_fd failed -- errno={}\n", .{@import("util.zig").getErrno()});
        node.throwErrno(env, "error calling accept on network socket");
        return null;
    }

    var object = node.createObject(env, "") catch return null;

    const sockaddrObj = createSockaddr(env, &sockaddr, addrlen);
    if (sockaddrObj == null) return null;
    node.setNamedProperty(env, object, "sockaddr", sockaddrObj, "setting sockaddr") catch return null;
    const new_fd = node.create_i32(env, fd, "fd") catch return null;
    node.setNamedProperty(env, object, "fd", new_fd, "setting fd") catch return null;
    return object;
}

//   getsockopt: (
//     socket: number,
//     level: number,
//     option_name: number,
//     max_len: number
//   ) => Buffer;
//
//     int getsockopt(int socket, int level, int option_name, void *option_value,
//         socklen_t *option_len);

fn getsockopt(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 4) catch return null;
    const socket_fd = node.i32FromValue(env, argv[0], "socket_fd") catch return null;
    const level = node.i32FromValue(env, argv[1], "option_name") catch return null;
    const option_name = node.i32FromValue(env, argv[2], "option_name") catch return null;
    var option_len = @intCast(c_uint, node.u32FromValue(env, argv[3], "option_len") catch return null);

    const option_value = std.c.malloc(option_len) orelse {
        node.throwError(env, "error allocating memory");
        return null;
    };
    defer std.c.free(option_value);

    const r = clib.getsockopt(socket_fd, level, option_name, option_value, &option_len);
    if (r == -1) {
        node.throwErrno(env, "error calling getsockopt on network socket");
        return null;
    }
    const buf = node.createBufferCopy(env, option_value, option_len, "return option Buffer") catch return null;
    return buf;
}

//   setsockopt: (
//     socket: number,
//     level: number,
//     option_name: number,
//     option_value: Buffer
//   ) => void;
//
//   int setsockopt(int socket, int level, int option_name, const void *option_value,
//       socklen_t option_len);
fn setsockopt(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 4) catch return null;
    const socket_fd = node.i32FromValue(env, argv[0], "socket_fd") catch return null;
    const level = node.i32FromValue(env, argv[1], "option_name") catch return null;
    const option_name = node.i32FromValue(env, argv[2], "option_name") catch return null;

    var option_value: [*]u8 = undefined;
    var option_len: usize = undefined;
    if (c.napi_get_buffer_info(env, argv[3], @ptrCast([*c]?*anyopaque, &option_value), &option_len) != c.napi_ok) {
        node.throwErrno(env, "error reading buffer");
        return null;
    }
    const r = clib.setsockopt(socket_fd, level, option_name, option_value, @intCast(c_uint, option_len));
    if (r == -1) {
        node.throwErrno(env, "error calling setsockopt on network socket");
        return null;
    }
    return null;
}

//   pollSocket: (fd: number, events: number, timeout_ms: number) => void;
fn pollSocket(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const argv = node.getArgv(env, info, 3) catch return null;
    const socket_fd = node.i32FromValue(env, argv[0], "socket_fd") catch return null;
    const events = node.i32FromValue(env, argv[1], "events") catch return null;
    const timeout_ms = node.i32FromValue(env, argv[2], "timeout_ms") catch return null;

    var fds: [1]clib.pollfd = undefined;
    fds[0].fd = socket_fd;
    fds[0].events = @intCast(c_short, events);
    fds[0].revents = 0;
    // std.debug.print("waiting {}ms for fd={}\n", .{ timeout_ms, fds[0].fd });
    const r = clib.poll(&fds, 1, timeout_ms);
    // std.debug.print("done waiting; r={}\n", .{r});
    if (r == -1) {
        node.throwErrno(env, "error polling for a socket");
        return null;
    }
    return null;
}
