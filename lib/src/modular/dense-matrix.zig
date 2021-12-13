const std = @import("std");
const errors = @import("../errors.zig");
const vector = @import("./dense-vector.zig");
const mod = @import("../arith.zig").mod;
const flint_nmod_mat = @import("../flint/nmod-mat.zig");

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

        pub fn jsonStringify(
            self: Matrix,
            options: std.json.StringifyOptions,
            writer: anytype,
        ) !void {
            _ = options;
            const obj = .{ .type = "DenseMatrixMod", .modulus = self.modulus, .nrows = self.nrows, .ncols = self.ncols, .entries = self.entries.items };
            try std.json.stringify(obj, options, writer);
        }

        pub fn format(self: Matrix, comptime fmt: []const u8, options: std.fmt.FormatOptions, writer: anytype) !void {
            _ = fmt;
            _ = options;

            var i: usize = 0;
            while (i < self.nrows) : (i += 1) {
                if (i > 0) try writer.print("\n", .{});
                try writer.print("[", .{});
                var j: usize = 0;
                while (j < self.ncols) : (j += 1) {
                    if (j > 0) try writer.print(" ", .{});
                    try writer.print("{}", .{self.entries.items[i * self.ncols + j]});
                }
                try writer.print("]", .{});
            }
        }

        pub fn unsafeSet(self: *Matrix, row: usize, col: usize, x: T) void {
            self.entries.items[row * self.ncols + col] = x;
        }

        pub fn set(self: *Matrix, row: usize, col: usize, x: T) !void {
            if (col >= self.ncols or row >= self.nrows) {
                return errors.General.IndexError;
            }
            self.unsafeSet(row, col, mod(x, self.modulus));
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

        pub fn addToRow(self: *Matrix, row: usize, v: vector.DenseVectorMod(T)) !void {
            if (v.degree != self.ncols or v.modulus != self.modulus) {
                return errors.General.TypeError;
            }
            if (row >= self.nrows) {
                return errors.General.IndexError;
            }
            var i: usize = 0;
            while (i < self.ncols) : (i += 1) {
                self.unsafeSet(row, i, mod(self.unsafeGet(row, i) + v.unsafeGet(i), self.modulus));
            }
        }

        pub fn toFlint(self: Matrix) flint_nmod_mat.MatrixModN {
            var m = flint_nmod_mat.MatrixModN.init(@intCast(c_ulong, self.modulus), @intCast(c_long, self.nrows), @intCast(c_long, self.ncols));
            var i: usize = 0;
            while (i < self.nrows) : (i += 1) {
                var j: usize = 0;
                while (j < self.ncols) : (j += 1) {
                    m.set(@intCast(c_long, i), @intCast(c_long, j), @intCast(c_ulong, self.unsafeGet(i, j)));
                }
            }
            return m;
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
    //std.debug.print("\nm={}\n", .{m});
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
    //std.debug.print("m={}\n", .{m});

    // output to json
    var out = std.ArrayList(u8).init(testing_allocator);
    defer out.deinit();
    try std.json.stringify(m, .{}, out.writer());
    try expect(std.mem.eql(u8, out.items,
        \\{"type":"DenseMatrixMod","modulus":19,"nrows":3,"ncols":5,"entries":[0,1,2,3,4,1,2,3,4,5,2,3,4,5,6]}
    ));
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

test "convert a matrix to flint" {
    var m = try DenseMatrixMod(i32).init(19, 2, 3, testing_allocator);
    defer m.deinit();
    try m.set(1, 0, 3);
    try m.set(1, 1, 5);
    var f = m.toFlint();
    defer f.deinit();
    try expect(f.get(1, 0) == 3);
    try expect(f.get(1, 1) == 5);
    try expect(f.modulus == 19);
    try expect(f.nrows() == 2);
    try expect(f.ncols() == 3);
}
