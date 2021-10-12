const std = @import("std");
const errors = @import("../errors.zig");

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

        pub fn set(self: *Matrix, row: usize, col: usize, x: T) !void {
            if (col >= self.ncols or row >= self.nrows) {
                return errors.General.IndexError;
            }
            self.entries.items[row * self.ncols + col] = x;
        }

        pub fn get(self: Matrix, row: usize, col: usize) !T {
            if (col >= self.ncols or row >= self.nrows) {
                return errors.General.IndexError;
            }
            return self.entries.items[row * self.ncols + col];
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
