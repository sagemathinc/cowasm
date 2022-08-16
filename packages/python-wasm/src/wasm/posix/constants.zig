pub fn keepalive() void {}
const std = @import("std");
const errno = @import("errno.zig");
const string = @cImport(@cInclude("string.h"));
const signal = @import("signal.zig");
const netdb = @import("netdb.zig");
const allocator = @import("../../interface/allocator.zig");

const constants = .{ .CONSTANTS = errno.CONSTANTS ++ signal.CONSTANTS ++ netdb.CONSTANTS, .VALUES = errno.VALUES ++ signal.VALUES ++ netdb.VALUES };

// var buf: [100]u8 = undefined;
// var fba = std.heap.FixedBufferAllocator.init(&buf);
// var string = std.ArrayList(u8).init(fba.allocator());
// try std.json.stringify(x, .{}, string.writer());

export fn getConstants() ?[*]u8 {
    const alloc = allocator.get();
    const s = std.json.stringifyAlloc(alloc, constants, .{}) catch {
        return null;
    };
    defer alloc.free(s);
    const p = toNullTerminatedString(s);
    return p;
}

// extern fn strcmp(s1: [*:0]const u8, s2: [*:0]const u8) c_int;
// fn eql(s1: [*:0]const u8, s2: [*:0]const u8) bool {
//     return strcmp(s1, s2) == 0;
// }

fn toNullTerminatedString(s: []const u8) ?[*]u8 {
    var m = std.c.malloc(s.len + 1) orelse return null;
    var ptr = @ptrCast([*]u8, m);
    _ = string.memcpy(ptr, s.ptr, s.len);
    return ptr;
}
