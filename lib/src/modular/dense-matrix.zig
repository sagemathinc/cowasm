const std = @import("std");
const errors = @import("../errors.zig");
const vector = @import("./dense-vector.zig");
const mod = @import("../arith.zig").mod;
const pari = @import("../pari/pari.zig");

pub fn DenseMatrixMod(comptime T: type) type {
    return struct {
        const Matrix = @This();

        modulus: T,
        nrows: usize,
        ncols: usize,
        entries: std.ArrayList(T),

        pub fn init(modulus: T, nrows: usize, ncols: usize, allocator: std.mem.Allocator) !Matrix {
            var entries = try std.ArrayList(T).initCapacity(allocator, nrows * ncols);
            entries.appendNTimesAssumeCapacity(0, nrows * ncols);
            return Matrix{ .modulus = modulus, .nrows = nrows, .ncols = ncols, .entries = entries };
        }

        pub fn initFromPari(modulus: T, A: pari.c.GEN, min_nrows: usize, min_ncols: usize, allocator: std.mem.Allocator) !Matrix {
            const size = pari.c.matsize(A);
            const nrows = @maximum(min_nrows, @intCast(usize, pari.c.itos(pari.getcoeff1(size, 1))));
            const ncols = @maximum(min_ncols, @intCast(usize, pari.c.itos(pari.getcoeff1(size, 2))));
            var M = try DenseMatrixMod(T).init(@intCast(T, modulus), nrows, ncols, allocator);
            // Copy the entries over
            var i: usize = 0;
            while (i < nrows) : (i += 1) {
                var j: usize = 0;
                while (j < ncols) : (j += 1) {
                    const x = @intCast(T, pari.c.itos(pari.c.lift(pari.getcoeff2(A, i + 1, j + 1))));
                    M.unsafeSet(i, j, x);
                }
            }
            return M;
        }

        pub fn deinit(self: *Matrix) void {
            self.entries.deinit();
        }

        pub fn copy(self: Matrix) !Matrix {
            var entries = try std.ArrayList(T).initCapacity(self.entries.allocator, self.nrows * self.ncols);
            entries.appendNTimesAssumeCapacity(0, self.nrows * self.ncols);
            var i: usize = 0;
            var n: usize = self.nrows * self.ncols;
            while (i < n) : (i += 1) {
                entries.items[i] = self.entries.items[i];
            }
            return Matrix{ .modulus = self.modulus, .nrows = self.nrows, .ncols = self.ncols, .entries = entries };
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

        // return new matrix "self - x"
        pub fn subtractScalar(self: Matrix, x: T) !Matrix {
            if (self.nrows != self.ncols) {
                // must be square.
                return errors.Math.ValueError;
            }
            var A = try self.copy();
            var i: usize = 0;
            while (i < self.nrows) : (i += 1) {
                A.unsafeSet(i, i, mod(self.unsafeGet(i, i) - x, self.modulus));
            }
            return A;
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

        pub fn setRow(self: *Matrix, row: usize, v: vector.DenseVectorMod(T)) !void {
            if (v.degree != self.ncols or v.modulus != self.modulus) {
                return errors.General.TypeError;
            }
            if (row >= self.nrows) {
                return errors.General.IndexError;
            }
            var i: usize = 0;
            while (i < self.ncols) : (i += 1) {
                self.unsafeSet(row, i, v.unsafeGet(i));
            }
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

        pub fn toPari(self: Matrix) pari.c.GEN {
            var z = pari.c.zeromatcopy(@intCast(c_long, self.nrows), @intCast(c_long, self.ncols));
            var i: usize = 0;
            while (i < self.nrows) : (i += 1) {
                var j: usize = 0;
                while (j < self.ncols) : (j += 1) {
                    const x = pari.c.gmodulss(self.unsafeGet(i, j), self.modulus);
                    pari.setcoeff2(z, i + 1, j + 1, x);
                }
            }
            return z;
        }

        pub fn rank(self: Matrix) usize {
            const context = pari.Context();
            defer context.deinit();
            var z = self.toPari();
            var r = pari.c.rank(z);
            return @intCast(usize, r);
        }

        pub fn kernel(self: Matrix) !Matrix {
            const context = pari.Context();
            defer context.deinit();
            var z = self.toPari();
            var K = pari.c.ker(z);
            var m = try Matrix.initFromPari(self.modulus, K, self.ncols, 0, self.entries.allocator);
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

test "set a row" {
    var nrows: usize = 2;
    var ncols: usize = 2;
    var m = try DenseMatrixMod(i32).init(19, nrows, ncols, testing_allocator);
    defer m.deinit();
    try m.set(1, 0, 3);
    try m.set(1, 1, 5);
    var v = try m.getRow(1);
    defer v.deinit();
    try m.setRow(0, v);
    try expect((try m.get(0, 0)) == 3);
    try expect((try m.get(0, 1)) == 5);
}

test "compute a kernel using PARI" {
    var m = try DenseMatrixMod(i32).init(19, 2, 2, testing_allocator);
    defer m.deinit();
    try m.set(0, 0, 1);
    try m.set(0, 1, 1);
    var K = try m.kernel();
    defer K.deinit();
    try expect((try K.get(0, 0)) == 18);
    try expect((try K.get(1, 0)) == 1);
    try expect(m.rank() == 1);
}

test "compute a trivial kernel using PARI" {
    var m = try DenseMatrixMod(i32).init(19, 1, 1, testing_allocator);
    defer m.deinit();
    try m.set(0, 0, 1);
    var K = try m.kernel();
    defer K.deinit();
    try expect(K.ncols == 0);
    try expect(m.rank() == 1);
}

test "compute another trivial kernel using PARI" {
    var m = try DenseMatrixMod(i32).init(3, 1, 1, testing_allocator);
    defer m.deinit();
    try m.set(0, 0, 1);
    var K = try m.kernel();
    defer K.deinit();
    try expect(K.ncols == 0);
    try expect(m.rank() == 1);
}

test "subtract a scalar" {
    var m = try DenseMatrixMod(i32).init(19, 2, 2, testing_allocator);
    defer m.deinit();
    var n = try m.subtractScalar(3);
    defer n.deinit();
    try expect((try n.get(0, 0)) == 16);
    try expect((try n.get(1, 1)) == 16);
    try expect((try n.get(0, 1)) == 0);
    try expect((try n.get(1, 0)) == 0);
}
