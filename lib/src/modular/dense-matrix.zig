const std = @import("std");
const errors = @import("../errors.zig");
const vector = @import("./dense-vector.zig");

pub fn DenseMatrixMod(comptime T: type) type {
    return struct {
        const Matrix = @This();

        modulus: T,
        nrows: usize,
        ncols: usize,
        entries: std.ArrayList(T),

        pub fn init(modulus: T, nrows: usize, ncols: usize, allocator: *std.mem.Allocator) !Matrix {
            var entries = try std.ArrayList(T).initCapacity(allocator, nrows * ncols);
            entries.appendNTimesAssumeCapacity(0, nrows * ncols);
            return Matrix{ .modulus = modulus, .nrows = nrows, .ncols = ncols, .entries = entries };
        }

        pub fn deinit(self: *Matrix) void {
            self.entries.deinit();
        }

        pub fn print(self: Matrix) void {
            std.debug.print("\n", .{});
            var i: usize = 0;
            while (i < self.nrows) : (i += 1) {
                var j: usize = 0;
                while (j < self.ncols) : (j += 1) {
                    std.debug.print("{} ", .{self.entries.items[i * self.ncols + j]});
                }
                std.debug.print("\n", .{});
            }
        }

        pub fn unsafeSet(self: *Matrix, row: usize, col: usize, x: T) void {
            self.entries.items[row * self.ncols + col] = x;
        }

        pub fn set(self: *Matrix, row: usize, col: usize, x: T) !void {
            if (col >= self.ncols or row >= self.nrows) {
                return errors.General.IndexError;
            }
            self.unsafeSet(row, col, x);
        }

        pub fn unsafeGet(self: Matrix, row: usize, col: usize) T {
            return self.entries.items[row * self.ncols + col];
        }

        pub fn get(self: Matrix, row: usize, col: usize) !T {
            if (col >= self.ncols or row >= self.nrows) {
                return errors.General.IndexError;
            }
            return self.unsafeGet(row, col);
        }

        pub fn getRow(self: Matrix, row: usize) !vector.DenseVectorMod(T) {
            var v = try vector.DenseVectorMod(T).init(self.modulus, self.ncols, self.entries.allocator);
            var i: usize = 0;
            while (i < self.ncols) : (i += 1) {
                v.unsafeSet(i, self.unsafeGet(row, i));
            }
            return v;
        }
    };
}

const testing_allocator = std.testing.allocator;
const expect = std.testing.expect;

test "create a matrix" {
    var nrows: usize = 3;
    var ncols: usize = 5;
    var m = try DenseMatrixMod(i32).init(19, nrows, ncols, testing_allocator);
    defer m.deinit();
    //m.print();
    var i: usize = 0;
    while (i < nrows) : (i += 1) {
        var j: usize = 0;
        while (j < ncols) : (j += 1) {
            try expect((try m.get(i, j)) == 0);
        }
    }
    i = 0;
    while (i < nrows) : (i += 1) {
        var j: usize = 0;
        while (j < ncols) : (j += 1) {
            try m.set(i, j, @intCast(i32, i + j));
        }
    }
    i = 0;
    while (i < nrows) : (i += 1) {
        var j: usize = 0;
        while (j < ncols) : (j += 1) {
            try expect((try m.get(i, j)) == @intCast(i32, i + j));
        }
    }
    //m.print();
}

test "extract a row" {
    var nrows: usize = 2;
    var ncols: usize = 2;
    var m = try DenseMatrixMod(i32).init(19, nrows, ncols, testing_allocator);
    defer m.deinit();
    try m.set(1, 0, 3);
    try m.set(1, 1, 5);
    var v = try m.getRow(1);
    defer v.deinit();
    try expect((try v.get(0)) == 3);
    try expect((try v.get(1)) == 5);
}
