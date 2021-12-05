const std = @import("std");
const errors = @import("../errors.zig");
const dense_matrix = @import("./dense-matrix.zig");
const mod = @import("../arith.zig").mod;

pub fn DenseVectorMod(comptime T: type) type {
    return struct {
        const Vector = @This();

        modulus: T,
        degree: usize,
        entries: std.ArrayList(T),

        pub fn init(modulus: T, degree: usize, allocator: *std.mem.Allocator) !Vector {
            var entries = try std.ArrayList(T).initCapacity(allocator, degree);
            entries.appendNTimesAssumeCapacity(0, degree);
            return Vector{ .modulus = modulus, .degree = degree, .entries = entries };
        }

        pub fn deinit(self: *Vector) void {
            self.entries.deinit();
        }

        fn checkCompatible(self: Vector, right: Vector) !void {
            if (self.modulus != right.modulus or self.degree != right.degree) {
                return errors.Math.ValueError;
            }
        }

        pub fn jsonStringify(
            self: Vector,
            options: std.json.StringifyOptions,
            writer: anytype,
        ) !void {
            _ = options;
            const obj = .{ .type = "DenseVectorMod", .modulus = self.modulus, .degree = self.degree, .entries = self.entries.items };
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
                try writer.print("{}", .{self.entries.items[i]});
            }
            try writer.print(")", .{});
        }

        pub fn unsafeSet(self: *Vector, i: usize, x: T) void {
            self.entries.items[i] = x;
        }

        pub fn set(self: *Vector, i: usize, x: T) !void {
            if (i >= self.degree) {
                return errors.General.IndexError;
            }
            self.unsafeSet(i, mod(x, self.modulus));
        }

        pub fn unsafeGet(self: Vector, i: usize) T {
            return self.entries.items[i];
        }

        pub fn get(self: Vector, i: usize) !T {
            if (i >= self.degree) {
                return errors.General.IndexError;
            }
            return self.unsafeGet(i);
        }

        // mutate self to equal self + s * right.
        pub fn addInPlace(self: *Vector, right: Vector, s: T) !void {
            if (s == 0) return;
            try self.checkCompatible(right);
            var i: usize = 0;
            if (s == 1) {
                while (i < right.degree) : (i += 1) {
                    self.unsafeSet(i, mod(self.unsafeGet(i) + right.unsafeGet(i), self.modulus));
                }
            } else {
                while (i < right.degree) : (i += 1) {
                    self.unsafeSet(i, mod(self.unsafeGet(i) + s * right.unsafeGet(i), self.modulus));
                }
            }
        }

        // Compute self * right, where right is a matrix with degree rows.
        pub fn multiplyTimesMatrix(self: Vector, right: dense_matrix.DenseMatrixMod(T)) !Vector {
            if (self.degree != right.nrows) {
                // incompatible matrix vector multiply
                std.debug.print("incompatible dimensions\n", .{});
                return errors.Math.ValueError;
            }
            if (self.modulus != right.modulus) {
                // incompatible moduli
                std.debug.print("incompatible moduli\n", .{});
                return errors.Math.ValueError;
            }
            var prod = try DenseVectorMod(i32).init(self.modulus, right.ncols, self.entries.allocator);
            var i: usize = 0;
            while (i < right.ncols) : (i += 1) {
                var j: usize = 0;
                while (j < self.degree) : (j += 1) {
                    prod.entries.items[i] = mod(prod.entries.items[i] + self.entries.items[j] * right.entries.items[right.ncols * j + i], self.modulus);
                }
            }

            return prod;
        }
    };
}

const testing_allocator = std.testing.allocator;
const expect = std.testing.expect;

test "create a vector" {
    var degree: usize = 5;
    var m = try DenseVectorMod(i32).init(19, degree, testing_allocator);
    defer m.deinit();
    //std.debug.print("m={}\n", .{m});
    var i: usize = 0;
    while (i < degree) : (i += 1) {
        try expect((try m.get(i)) == 0);
    }
    i = 0;
    while (i < degree) : (i += 1) {
        try m.set(i, @intCast(i32, i));
    }
    i = 0;
    while (i < degree) : (i += 1) {
        try expect((try m.get(i)) == i);
    }
    //std.debug.print("m={}\n", .{m});

    // output to json
    var out = std.ArrayList(u8).init(testing_allocator);
    defer out.deinit();
    try std.json.stringify(m, .{}, out.writer());
    try expect(std.mem.eql(u8, out.items,
        \\{"type":"DenseVectorMod","modulus":19,"degree":5,"entries":[0,1,2,3,4]}
    ));
}

test "multiply a vector by a matrix" {
    var nrows: usize = 3;
    var ncols: usize = 5;
    var p: i32 = 11;
    var v = try DenseVectorMod(i32).init(p, nrows, testing_allocator);
    defer v.deinit();
    var i: usize = 0;
    while (i < nrows) : (i += 1) {
        try v.set(i, @intCast(i32, i));
    }

    var m = try dense_matrix.DenseMatrixMod(i32).init(p, nrows, ncols, testing_allocator);
    defer m.deinit();
    i = 0;
    while (i < nrows) : (i += 1) {
        var j: usize = 0;
        while (j < ncols) : (j += 1) {
            try m.set(i, j, @intCast(i32, 3 * i + j));
        }
    }

    //v.print();
    //m.print();
    var prod = try v.multiplyTimesMatrix(m);
    defer prod.deinit();
    // sage: vector(GF(11),[0,1,2])*matrix(3,5,[3*i+j for i in range(3) for j in range(5)])
    // (4, 7, 10, 2, 5)'
    //prod.print();
    try expect((try prod.get(0)) == 4);
    try expect((try prod.get(1)) == 7);
    try expect((try prod.get(2)) == 10);
    try expect((try prod.get(3)) == 2);
    try expect((try prod.get(4)) == 5);
}
