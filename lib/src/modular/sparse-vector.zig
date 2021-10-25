const std = @import("std");
const mod = @import("../arith.zig").mod;
const errors = @import("../errors.zig");
const AutoHashMap = std.AutoHashMap;

pub fn SparseVectorMod(comptime T: type) type {
    return struct {
        const Vector = @This();

        modulus: T,
        degree: usize,
        map: AutoHashMap(usize, T),

        pub fn init(modulus: T, degree: usize, allocator: *std.mem.Allocator) !Vector {
            if (modulus <= 1) {
                return errors.Math.ValueError;
            }
            var map = AutoHashMap(usize, T).init(allocator);
            return Vector{ .modulus = modulus, .degree = degree, .map = map };
        }

        pub fn clone(self: Vector) !Vector {
            var map = try self.map.clone();
            return Vector{ .modulus = self.modulus, .degree = self.degree, .map = map };
        }

        pub fn deinit(self: *Vector) void {
            self.map.deinit();
        }

        pub fn unsafeSet(self: *Vector, i: usize, x: T) !void {
            if (x == 0) {
                // delete entry i
                _ = self.map.remove(i);
            } else {
                try self.map.put(i, x);
            }
        }

        pub fn set(self: *Vector, i: usize, x: T) !void {
            if (i >= self.degree) {
                return errors.General.IndexError;
            }
            try self.unsafeSet(i, mod(x, self.modulus));
        }

        pub fn unsafeGet(self: Vector, i: usize) T {
            return self.map.get(i) orelse 0;
        }

        pub fn get(self: Vector, i: usize) !T {
            if (i >= self.degree) {
                return errors.General.IndexError;
            }
            return self.unsafeGet(i);
        }

        pub fn jsonStringify(
            self: Vector,
            options: std.json.StringifyOptions,
            writer: anytype,
        ) !void {
            _ = options;
            const obj = .{ .type = "SparseVectorMod", .modulus = self.modulus, .degree = self.degree };
            try std.json.stringify(obj, options, writer);
        }

        pub fn format(self: Vector, comptime fmt: []const u8, options: std.fmt.FormatOptions, writer: anytype) !void {
            _ = fmt;
            _ = options;
            try writer.print("(", .{});
            var i: usize = 0;
            while (i < self.degree) : (i += 1) {
                if (i > 0) {
                    try writer.print(", ", .{});
                }
                try writer.print("{}", .{self.get(i)});
            }
            try writer.print(")", .{});
        }

        fn checkCompatible(self: Vector, right: Vector) !void {
            if (self.modulus != right.modulus or self.degree != right.degree) {
                return errors.Math.ValueError;
            }
        }

        fn op(self: Vector, right: Vector, do_add: bool) !Vector {
            try self.checkCompatible(right);
            // clone self and then add/subtract right into it.
            var v = try self.clone();
            var it = right.map.iterator();
            while (it.next()) |kv| {
                const i = kv.key_ptr.*;
                const val = kv.value_ptr.*;
                var x: T = undefined;
                if (do_add) {
                    x = v.unsafeGet(i) + val;
                } else {
                    x = v.unsafeGet(i) - val;
                }
                try v.unsafeSet(i, mod(x, self.modulus));
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
            var scalar = mod(s, self.modulus);
            if (scalar == 1) return;
            var it = self.map.iterator();
            while (it.next()) |kv| {
                const i = kv.key_ptr.*;
                const val = kv.value_ptr.*;
                self.unsafeSet(i, mod(val * scalar, self.modulus)) catch {
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
            try self.checkCompatible(right);
            var it = right.map.iterator();
            while (it.next()) |kv| {
                const i = kv.key_ptr.*;
                const val = kv.value_ptr.*;
                try self.unsafeSet(i, mod(self.unsafeGet(i) + s * val, self.modulus));
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
    var v = try SparseVectorMod(i32).init(11, 1234567 + 1, testing_allocator);
    defer v.deinit();
    try expect((try v.get(7)) == 0);
    try v.set(7, 15);
    try expect((try v.get(7)) == 4);
    try v.set(7, 19);
    try expect((try v.get(7)) == 8);
    try v.set(1234567, -5);
    try expect((try v.get(1234567)) == 6);
    try expect(v.count() == 2);
    // setting an entry to 0
    try v.set(7, 0);
    try expect((try v.get(7)) == 0);
    try expect(v.count() == 1);
}

test "adding and subtracting two vectors" {
    var v = try SparseVectorMod(i32).init(11, 3, testing_allocator);
    defer v.deinit();
    try v.set(0, 5);
    try v.set(1, 3);
    var w = try SparseVectorMod(i32).init(11, 3, testing_allocator);
    defer w.deinit();
    try w.set(0, 8);
    try w.set(2, 10);
    var y = try v.add(w);
    defer y.deinit();
    try expect((try y.get(0)) == 2);
    try expect((try y.get(1)) == 3);
    try expect((try y.get(2)) == 10);

    var z = try v.sub(w);
    defer z.deinit();
    try expect((try z.get(0)) == 8);
    try expect((try z.get(1)) == 3);
    try expect((try z.get(2)) == 1);
}

test "add a multiple of one vector into another" {
    var v = try SparseVectorMod(i32).init(11, 3, testing_allocator);
    defer v.deinit();
    try v.set(0, 5);
    try v.set(1, 3);
    var w = try SparseVectorMod(i32).init(11, 3, testing_allocator);
    defer w.deinit();
    try w.set(0, 8);
    try w.set(2, 10);
    try v.addInPlace(w, 3); // (5,3,0) + 3*(8,0,10)
    try expect((try v.get(0)) == 7);
    try expect((try v.get(1)) == 3);
    try expect((try v.get(2)) == 8);
}

fn bench1(comptime N: anytype) !void {
    const time = std.time.milliTimestamp;
    const t = time();
    var v = try SparseVectorMod(i32).init(11, N, testing_allocator);
    defer v.deinit();
    var w = try SparseVectorMod(i32).init(11, N, testing_allocator);
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
    var v = try SparseVectorMod(i32).init(15, 2, testing_allocator);
    defer v.deinit();
    try v.set(0, 5);
    try v.set(1, 3);
    var w = try v.scale(3);
    defer w.deinit();
    try expect((try w.get(0)) == 0);
    try expect((try w.get(1)) == 9);
    v.rescale(3);
    try expect((try v.get(0)) == 0);
    try expect((try v.get(1)) == 9);
}
