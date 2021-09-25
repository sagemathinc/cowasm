const std = @import("std");
const mod = @import("../arith.zig").mod;
const errors = @import("../errors.zig");
const AutoHashMap = std.AutoHashMap;

pub fn SparseVectorMod(comptime T: type) type {
    return struct {
        const Vector = @This();

        n: T,
        map: AutoHashMap(usize, T),

        pub fn init(n: T, allocator: *std.mem.Allocator) !Vector {
            if (n <= 1) {
                return errors.Math.ValueError;
            }
            var map = AutoHashMap(usize, T).init(allocator);
            return Vector{ .n = n, .map = map };
        }

        pub fn clone(self: Vector) !Vector {
            var map = try self.map.clone();
            return Vector{ .n = self.n, .map = map };
        }

        pub fn deinit(self: *Vector) void {
            self.map.deinit();
        }

        pub fn set(self: *Vector, i: usize, x: T) !void {
            const v = mod(x, self.n);
            if (v == 0) {
                // delete entry i
                _ = self.map.remove(i);
            } else {
                try self.map.put(i, v);
            }
        }

        pub fn get(self: Vector, i: usize) T {
            return self.map.get(i) orelse 0;
        }

        pub fn print(self: Vector, degree: usize) void {
            var i: usize = 0;
            while (i < degree) : (i += 1) {
                std.debug.print("{}  ", .{self.get(i)});
            }
            std.debug.print("\n", .{});
        }

        fn op(self: Vector, right: Vector, do_add: bool) !Vector {
            if (self.n != right.n) {
                return errors.Math.ValueError;
            }
            // clone self and then add right into it.
            var v = try self.clone();
            var it = right.map.iterator();
            while (it.next()) |kv| {
                const i = kv.key_ptr.*;
                const val = kv.value_ptr.*;
                var x: T = undefined;
                if (do_add) {
                    x = v.get(i) + val;
                } else {
                    x = v.get(i) - val;
                }
                try v.set(i, mod(x, self.n));
            }
            return v;
        }

        pub fn add(self: Vector, right: Vector) !Vector {
            return self.op(right, true);
        }

        pub fn sub(self: Vector, right: Vector) !Vector {
            return self.op(right, false);
        }

        pub fn rescale(self: *Vector, s: T) void {
            var scalar = mod(s, self.n);
            if (scalar == 1) return;
            var it = self.map.iterator();
            while (it.next()) |kv| {
                const i = kv.key_ptr.*;
                const val = kv.value_ptr.*;
                self.set(i, val * scalar) catch {
                    // can't happen since not allocating, etc.
                    unreachable;
                };
            }
        }

        pub fn scale(self: Vector, s: T) !Vector {
            var v = try self.clone();
            v.rescale(s);
            return v;
        }

        // mutate self to equal self + s * right.
        pub fn addInPlace(self: *Vector, right: Vector, s: T) !void {
            var it = right.map.iterator();
            while (it.next()) |kv| {
                const i = kv.key_ptr.*;
                const val = kv.value_ptr.*;
                try self.set(i, self.get(i) + s * val);
            }
        }

        // number of nonzero entries
        pub fn count(self: Vector) usize {
            return self.map.count();
        }
    };
}

const expect = std.testing.expect;
const testing_allocator = std.testing.allocator;

test "creating a vector, then set and get entries" {
    var v = try SparseVectorMod(i32).init(11, testing_allocator);
    defer v.deinit();
    try expect(v.get(7) == 0);
    try v.set(7, 15);
    try expect(v.get(7) == 4);
    try v.set(7, 19);
    try expect(v.get(7) == 8);
    try v.set(1234567, -5);
    try expect(v.get(1234567) == 6);
    try expect(v.count() == 2);
    // setting an entry to 0
    try v.set(7, 0);
    try expect(v.get(7) == 0);
    try expect(v.count() == 1);
}

test "adding and subtracting two vectors" {
    var v = try SparseVectorMod(i32).init(11, testing_allocator);
    defer v.deinit();
    try v.set(0, 5);
    try v.set(1, 3);
    var w = try SparseVectorMod(i32).init(11, testing_allocator);
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

test "add a multiple of one vector into another" {
    var v = try SparseVectorMod(i32).init(11, testing_allocator);
    defer v.deinit();
    try v.set(0, 5);
    try v.set(1, 3);
    var w = try SparseVectorMod(i32).init(11, testing_allocator);
    defer w.deinit();
    try w.set(0, 8);
    try w.set(2, 10);
    try v.addInPlace(w, 3); // (5,3) + 3*(8,0,10)
    try expect(v.get(0) == 7);
    try expect(v.get(1) == 3);
    try expect(v.get(2) == 8);
}

fn bench1(comptime N: anytype) !void {
    const time = std.time.milliTimestamp;
    const t = time();
    var v = try SparseVectorMod(i32).init(11, testing_allocator);
    defer v.deinit();
    var w = try SparseVectorMod(i32).init(11, testing_allocator);
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

test "scale and rescale a vector" {
    var v = try SparseVectorMod(i32).init(15, testing_allocator);
    defer v.deinit();
    try v.set(0, 5);
    try v.set(1, 3);
    var w = try v.scale(3);
    defer w.deinit();
    try expect(w.get(0) == 0);
    try expect(w.get(1) == 9);
    v.rescale(3);
    try expect(v.get(0) == 0);
    try expect(v.get(1) == 9);
}

