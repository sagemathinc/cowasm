const p1list = @import("./p1list.zig");
const std = @import("std");
const P1Lists = @import("./p1list-container.zig").P1Lists;
const page_allocator = std.heap.page_allocator;

extern fn reportError() void;
//fn reportError() void {}

fn P1ListT(comptime T: type, N: i32) !p1list.P1ListType(T) {
    return p1list.P1List(@intCast(T, N), std.heap.page_allocator);
}

// pub export fn P1List(N: i32) i32 {
//     if (N <= 127) { // 2^7 - 1
//         return P1ListT(i16, N);
//     } else if (N <= 46340) { // 2^15 - 1
//         return P1ListT(i32, N);
//     } else if (N <= 2147483647) { // 2^31 - 1
//         return P1ListT(i64, N);
//     } else {
//         reportError();
//         return -1;
//     }
// }

var p1lists32 = P1Lists(i32).init(std.heap.page_allocator);

pub export fn P1List(N: i32) i32 {
    var P1 = P1ListT(i32, N) catch {
        reportError();
        return -1;
    };
    return p1lists32.put(P1) catch {
        reportError();
        return -1;
    };
}

pub export fn P1List_count(handle: i32) i32 {
    const P1 = p1lists32.get(handle) orelse {
        reportError();
        return -1;
    };
    return @intCast(i32, P1.count()); // TODO -- need error catching cast..
}

pub export fn P1List_free(handle: i32) void {
    p1lists32.free(handle);
}

const expect = std.testing.expect;

test "creating an object and storing it" {
    var handle = P1List(5077);
    try expect(P1List_len(handle) == 5078);
}
