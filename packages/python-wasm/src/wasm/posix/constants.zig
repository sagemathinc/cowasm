pub fn keepalive() void {}
const std = @import("std");
const errno = @import("errno.zig");
const signal = @import("signal.zig");
const netdb = @import("netdb.zig");
const util = @import("util.zig");

const constants = .{ .CONSTANTS = errno.CONSTANTS ++ signal.CONSTANTS ++ netdb.CONSTANTS, .VALUES = errno.VALUES ++ signal.VALUES ++ netdb.VALUES };

// Caller must std.c.free the string it gets back.
export fn getConstants() ?[*:0]u8 {
    return util.structToNullTerminatedJsonString(@TypeOf(constants), constants) catch {
        return null;
    };
}
