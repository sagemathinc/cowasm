const p1list = @import("./p1list.zig");
const std = @import("std");
const page_allocator = std.heap.page_allocator;

pub export fn P1List(N: i32) i32 {
    var P1 = p1list.P1List(N, std.heap.page_allocator) catch {
        return -1;
    };
    defer P1.deinit();
    return @intCast(i32, P1.list.items.len);
}
