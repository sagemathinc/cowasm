const std = @import("std");
const string = @cImport(@cInclude("string.h"));
const allocator = @import("../../interface/allocator.zig");

// extern fn strcmp(s1: [*:0]const u8, s2: [*:0]const u8) c_int;
// fn eql(s1: [*:0]const u8, s2: [*:0]const u8) bool {
//     return strcmp(s1, s2) == 0;
// }

const Errors = error{MemoryError};
var gpa = std.heap.GeneralPurposeAllocator(.{}){};
const alloc = gpa.allocator();

pub fn zigStringToNullTerminatedString(s: []const u8) ![*:0]u8 {
    var m = std.c.malloc(s.len + 1) orelse return Errors.MemoryError;
    var ptr = @ptrCast([*]u8, m);
    _ = string.memcpy(ptr, s.ptr, s.len);
    ptr[s.len] = 0; // also set the null termination of the string.
    return @ptrCast([*:0]u8, ptr);
}

pub fn structToJsonZigString(comptime T: type, obj: T) ![]const u8 {
    return std.json.stringifyAlloc(alloc, obj, .{});
}

// Caller must free with std.c.free.
pub fn structToNullTerminatedJsonString(comptime T: type, obj: T) ![*:0]u8 {
    const s = try structToJsonZigString(T, obj);
    defer alloc.free(s);
    return try zigStringToNullTerminatedString(s);
}
