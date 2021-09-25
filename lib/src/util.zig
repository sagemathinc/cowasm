const std = @import("std");
const List = std.ArrayList;

pub fn range(allocator: *std.mem.Allocator, comptime T: type, n: usize) !List(T) {
    var v = try List(T).initCapacity(allocator, n);
    var i: T = 0;
    while (i < n) : (i += 1) {
        try v.append(i);
    }
    return v;
}

pub fn constantList(allocator: *std.mem.Allocator, x: anytype, n: usize) !List(@TypeOf(x)) {
    const T = @TypeOf(x);
    var v = try List(T).initCapacity(allocator, n);
    var i: usize = 0;
    while (i < n) : (i += 1) {
        try v.append(x);
    }
    return v;
}

const expect = std.testing.expect;
const allocator0 = std.testing.allocator;

test "create a range" {
    const v = try range(allocator0, i16, 10);
    defer v.deinit();
    try expect(v.items.len == 10);
    //std.debug.print("{}\n", .{v});
}

test "create a bigger range and check some things" {
    const v = try range(allocator0, i32, 100000);
    defer v.deinit();
    try expect(v.items.len == 100000);
    try expect(v.items[0] == 0);
    try expect(v.items[99999] == 99999);
}

test "create a constant list" {
    const v = try constantList(allocator0, @as(i16, 5), 3);
    defer v.deinit();
    try expect(v.items.len == 3);
    try expect(v.items[0] == 5);
    try expect(v.items[1] == 5);
    try expect(v.items[2] == 5);
}
