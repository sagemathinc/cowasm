pub fn keepalive() void {}
const std = @import("std");
const errno = @import("errno.zig");
const signal = @import("signal.zig");
const netdb = @import("netdb.zig");
const util = @import("util.zig");

const constants = .{ .constants = errno.constants ++ signal.constants ++ netdb.constants, .values = errno.values ++ signal.values ++ netdb.values };

// Caller must std.c.free the string it gets back.
export fn getConstants() ?[*:0]u8 {
    return util.structToNullTerminatedJsonString(@TypeOf(constants), constants) catch {
        return null;
    };
}
