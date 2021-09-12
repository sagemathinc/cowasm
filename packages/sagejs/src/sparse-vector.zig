const std = @import("std");
const mod = @import("./arith.zig").mod;
const errors = @import("./errors.zig");
const AutoHashMap = std.AutoHashMap;

pub fn SparseVectorModP(comptime T: type) type {
    return struct {
        const Vector = @This();

        p: T,
        map: AutoHashMap(usize, T),

        pub fn init(p: T, allocator: *std.mem.Allocator) !Vector {
            if (p <= 1) {
                return errors.Math.ValueError;
            }
            var map = AutoHashMap(usize, T).init(allocator);
            return Vector{ .p = p, .map = map };
        }

        pub fn clone(self: Vector) !Vector {
            var map = try self.map.clone();
            return Vector{ .p = self.p, .map = map };
        }

        pub fn deinit(self: *Vector) void {
            self.map.deinit();
        }

        pub fn set(self: *Vector, i: usize, x: T) !void {
            try self.map.put(i, mod(x, self.p));
        }

        pub fn get(self: *Vector, i: usize) T {
            return self.map.get(i) orelse 0;
        }

        fn op(self: Vector, right: Vector, add: bool) !Vector {
            if (self.p != right.p) {
                return errors.Math.ValueError;
            }
            var v = try self.clone();
            var it = right.map.iterator();
            while (it.next()) |kv| {
                const i = kv.key_ptr.*;
                const val = kv.value_ptr.*;
                var x: T = undefined;
                if (add) {
                    x = v.get(i) + val;
                } else {
                    x = v.get(i) - val;
                }
                try v.set(i, mod(x, self.p));
            }
            return v;
        }

        fn add(self: Vector, right: Vector) !Vector {
            return self.op(right, true);
        }

        fn sub(self: Vector, right: Vector) !Vector {
            return self.op(right, false);
        }
    };
}

const expect = std.testing.expect;
const allocator = std.testing.allocator;

test "creating a vector, then set and get entries" {
    var v = try SparseVectorModP(i32).init(11, allocator);
    defer v.deinit();
    try expect(v.get(7) == 0);
    try v.set(7, 15);
    try expect(v.get(7) == 4);
    try v.set(7, 19);
    try expect(v.get(7) == 8);
    try v.set(1234567, -5);
    try expect(v.get(1234567) == 6);
}

test "adding and subtracting two vectors" {
    var v = try SparseVectorModP(i32).init(11, allocator);
    defer v.deinit();
    try v.set(0, 5);
    try v.set(1, 3);
    var w = try SparseVectorModP(i32).init(11, allocator);
    defer w.deinit();
    try w.set(0, 8);
    try w.set(2, 10);
    var y = try v.add(w);
    defer y.deinit();
    try expect(y.get(0) == 2);
    try expect(y.get(1) == 3);
    try expect(y.get(2) == 10);

    var z = try v.sub(w);
    defer z.deinit();
    try expect(z.get(0) == 8);
    try expect(z.get(1) == 3);
    try expect(z.get(2) == 1);
}

fn bench1(comptime N: anytype) !void {
    const time = std.time.milliTimestamp;
    const t = time();
    var v = try SparseVectorModP(i32).init(11, allocator);
    defer v.deinit();
    var w = try SparseVectorModP(i32).init(11, allocator);
    defer w.deinit();
    var i: usize = 0;
    while (i < N) : (i += 1) {
        try v.set(i, @intCast(i32, i));
        try w.set(i, @intCast(i32, i));
    }
    i = 0;
    while (i < N) : (i += 1) {
        var y = try v.add(w);
        defer y.deinit();
    }
    std.debug.print("N={}, time = {}\n", .{ N, time() - t });
}

// test "not ridiculously slow" {
//     try bench1(100);
//     try bench1(1000);
//     try bench1(5000);
// }
