pub fn keepalive() void {}
const std = @import("std");
const util = @import("util.zig");

const sockaddr_struct = struct { sa_family: u16, sa_data: [*]u8 };

export fn recv_sockaddr_sa_family(sockaddr: *sockaddr_struct) u16 {
    std.debug.print("sockaddr = {}\n", .{sockaddr});
    return sockaddr.sa_family;
}

// do NOT free the returned string - it's just a reference into sockaddr
export fn recv_sockaddr_sa_data(sockaddr: *sockaddr_struct) [*]u8 {
    return sockaddr.sa_data;
}
