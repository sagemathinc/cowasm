const p1list = @import("./p1list.zig");
const std = @import("std");
const page_allocator = std.heap.page_allocator;

extern fn reportError() void;

fn P1ListT(comptime T: type, N: i32) i32 {
    var P1 = p1list.P1List(@intCast(T, N), std.heap.page_allocator) catch {
        reportError();
        return -1;
    };
    defer P1.deinit();
    return @intCast(i32, P1.list.items.len);
}

pub export fn P1List(N: i32) i32 {
    if (N <= 127) { // 2^7 - 1
        return P1ListT(i16, N);
    } else if (N <= 46340) { // 2^15 - 1
        return P1ListT(i32, N);
    } else if (N <= 2147483647) { // 2^31 - 1
        return P1ListT(i64, N);
    } else {
        reportError();
        return -1;
    }
}
