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

// here "array" and "string" are meant in the C sense, not the zig sense.
pub fn freeArrayOfStrings(s: [*]?[*:0]u8) void {
    var i: usize = 0;
    while (s[i] != null) : (i += 1) {
        std.c.free(s[i]);
    }
    std.c.free(s);
}

pub fn getErrno() c_int {
    return std.c._errno().*;
}

pub fn setErrno(errnoVal: c_int) void {
    std.c._errno().* = errnoVal;
}

pub fn printErrno() void {
    std.debug.print("errno = {}\n", .{getErrno()});
}

pub const errno = @cImport(@cInclude("errno.h"));
pub const constants = .{
    .c_import = errno,
    .names = [_][:0]const u8{ "E2BIG", "EACCES", "EBADF", "EBUSY", "ECHILD", "EDEADLK", "EEXIST", "EFAULT", "EFBIG", "EINTR", "EINVAL", "EIO", "EISDIR", "EMFILE", "EMLINK", "ENFILE", "ENODEV", "ENOENT", "ENOEXEC", "ENOMEM", "ENOSPC", "ENOTBLK", "ENOTDIR", "ENOTTY", "ENXIO", "EPERM", "EPIPE", "EROFS", "ESPIPE", "ESRCH", "ETXTBSY", "EXDEV" },
};
