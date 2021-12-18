// https://flintlib.org/doc/nmod_mat.html
const std = @import("std");
const allocator = @import("../interface/allocator.zig");
const nmod_mat = @cImport(@cInclude("nmod_mat.h"));
const mp_limb_t = nmod_mat.mp_limb_t;
const errors = @import("../errors.zig");

pub const MatrixModN = struct {
    mat: nmod_mat.nmod_mat_t,
    modulus: nmod_mat.mp_limb_t,

    pub fn init(mod: nmod_mat.mp_limb_t, _nrows: nmod_mat.slong, _ncols: nmod_mat.slong) MatrixModN {
        var mat: nmod_mat.nmod_mat_t = undefined;
        nmod_mat.nmod_mat_init(&mat, _nrows, _ncols, mod);
        return MatrixModN{ .mat = mat, .modulus = mod };
    }

    pub fn deinit(self: *MatrixModN) void {
        nmod_mat.nmod_mat_clear(&self.mat);
    }

    pub fn nrows(self: MatrixModN) nmod_mat.slong {
        return nmod_mat.nmod_mat_nrows(&self.mat);
    }

    pub fn ncols(self: MatrixModN) nmod_mat.slong {
        return nmod_mat.nmod_mat_ncols(&self.mat);
    }

    pub fn get(self: MatrixModN, i: nmod_mat.slong, j: nmod_mat.slong) nmod_mat.mp_limb_t {
        return nmod_mat.nmod_mat_get_entry(&self.mat, i, j);
    }

    pub fn set(self: *MatrixModN, i: nmod_mat.slong, j: nmod_mat.slong, x: nmod_mat.mp_limb_t) void {
        nmod_mat.nmod_mat_set_entry(&self.mat, i, j, x);
    }

    pub fn det(self: MatrixModN) nmod_mat.mp_limb_t {
        return nmod_mat.nmod_mat_det(&self.mat);
    }

    pub fn trace(self: MatrixModN) nmod_mat.mp_limb_t {
        return nmod_mat.nmod_mat_trace(&self.mat);
    }

    // Note: modulus must be prime.
    pub fn rank(self: MatrixModN) nmod_mat.slong {
        return nmod_mat.nmod_mat_rank(&self.mat);
    }

    // Mutates self to rref and returns the rank.
    // Modulus must be prime.
    pub fn rref(self: *MatrixModN) nmod_mat.slong {
        return nmod_mat.nmod_mat_rref(&self.mat);
    }

    // Matrix whose columns are a basis for the right kernel.
    // NOTE: unlike flint, we do remove extra 0 columns.
    pub fn kernel(self: MatrixModN) MatrixModN {
        var ker: nmod_mat.nmod_mat_t = undefined;
        const nc = @minimum(self.nrows(), self.ncols());
        nmod_mat.nmod_mat_init(&ker, self.ncols(), nc, self.modulus);
        const nullity = nmod_mat.nmod_mat_nullspace(&ker, &self.mat);
        std.debug.print("nullity={}\n", .{nullity});
        if (nc == nullity) {
            return MatrixModN{ .mat = ker, .modulus = self.modulus };
        }
        // too many columns
        var ker2: nmod_mat.nmod_mat_t = undefined;
        nmod_mat.nmod_mat_init(&ker2, self.ncols(), nullity, self.modulus);
        var i: nmod_mat.slong = 0;
        while (i < self.ncols()) : (i += 1) {
            var j: nmod_mat.slong = 0;
            while (j < nullity) : (j += 1) {
                nmod_mat.nmod_mat_set_entry(&ker2, i, j, nmod_mat.nmod_mat_get_entry(&ker, i, j));
            }
        }
        return MatrixModN{ .mat = ker2, .modulus = self.modulus };
    }

    pub fn inverse(self: MatrixModN) !MatrixModN {
        var mat: nmod_mat.nmod_mat_t = undefined;
        nmod_mat.nmod_mat_init(&mat, self.nrows(), self.ncols(), self.modulus);
        if (nmod_mat.nmod_mat_inv(&mat, &self.mat) == 0) {
            // error -- not invertible
            return errors.Math.ZeroDivisionError;
        }
        return MatrixModN{ .mat = mat, .modulus = self.modulus };
    }

    pub fn mul(self: MatrixModN, right: MatrixModN) !MatrixModN {
        if (self.ncols() != right.nrows() or self.modulus != right.modulus) {
            return errors.Math.ValueError;
        }
        var mat: nmod_mat.nmod_mat_t = undefined;
        nmod_mat.nmod_mat_init(&mat, self.nrows(), right.ncols(), self.modulus);
        nmod_mat.nmod_mat_mul(&mat, &self.mat, &right.mat);
        return MatrixModN{ .mat = mat, .modulus = self.modulus };
    }

    pub fn format(self: MatrixModN, comptime fmt: []const u8, options: std.fmt.FormatOptions, writer: anytype) !void {
        _ = fmt;
        _ = options;

        var i: nmod_mat.slong = 0;
        while (i < self.nrows()) : (i += 1) {
            if (i > 0) try writer.print("\n", .{});
            try writer.print("[", .{});
            var j: nmod_mat.slong = 0;
            while (j < self.ncols()) : (j += 1) {
                if (j > 0) try writer.print(" ", .{});
                try writer.print("{}", .{self.get(i, j)});
            }
            try writer.print("]", .{});
        }
    }

    pub fn entries(self: MatrixModN) !std.ArrayList(nmod_mat.mp_limb_t) {
        var v = try std.ArrayList(nmod_mat.mp_limb_t).initCapacity(allocator.get(), @intCast(usize, self.nrows() * self.ncols()));
        var i: nmod_mat.slong = 0;
        while (i < self.nrows()) : (i += 1) {
            var j: nmod_mat.slong = 0;
            while (j < self.ncols()) : (j += 1) {
                try v.append(self.get(i, j));
            }
        }
        return v;
    }

    pub fn jsonStringify(
        self: MatrixModN,
        options: std.json.StringifyOptions,
        writer: anytype,
    ) !void {
        _ = options;
        const v = try self.entries();
        defer v.deinit();
        const obj = .{ .type = "flint.MatrixModN", .modulus = self.modulus, .nrows = self.nrows(), .ncols = self.ncols(), .entries = v.items };
        try std.json.stringify(obj, options, writer);
    }
};

const expect = std.testing.expect;

test "test out a bunch of functions on a little 2x2 matrix mod 7" {
    var m = MatrixModN.init(7, 2, 2);
    defer m.deinit();
    try expect(m.modulus == 7);
    try expect(m.get(0, 0) == 0);
    try expect(m.get(0, 1) == 0);
    try expect(m.get(1, 0) == 0);
    try expect(m.get(1, 1) == 0);
    try expect(m.rank() == 0);
    //std.debug.print("m = {}\n", .{m});

    m.set(0, 0, 1);
    m.set(0, 1, 2);
    m.set(1, 0, 3);
    m.set(1, 1, 4);
    //std.debug.print("m = {}\n", .{m});

    // det = -2 = 5 (mod 7):
    try expect(m.det() == 5);
    try expect(m.trace() == 5);
    try expect(m.rank() == 2);

    var n = try m.inverse();
    defer n.deinit();
    try expect(n.get(0, 0) == 5);
    try expect(n.get(0, 1) == 1);
    try expect(n.get(1, 0) == 5);
    try expect(n.get(1, 1) == 3);

    var nm = try n.mul(m);
    defer nm.deinit();
    try expect(nm.get(0, 0) == 1);
    try expect(nm.get(0, 1) == 0);
    try expect(nm.get(1, 0) == 0);
    try expect(nm.get(1, 1) == 1);

    // rref
    try expect(m.rref() == 2);
    try expect(m.get(0, 0) == 1);
    try expect(m.get(0, 1) == 0);
    try expect(m.get(1, 0) == 0);
    try expect(m.get(1, 1) == 1);

    //std.debug.print("\n{}\n", .{m.entries()});
    // output to json
    var out = std.ArrayList(u8).init(std.testing.allocator);
    defer out.deinit();
    try std.json.stringify(n, .{}, out.writer());
    try expect(std.mem.eql(u8, out.items,
        \\{"type":"flint.MatrixModN","modulus":7,"nrows":2,"ncols":2,"entries":[5,1,5,3]}
    ));
}

test "compute 1 dimensional kernel of the [1,2,2,4] square matrix mod 997" {
    var m = MatrixModN.init(997, 2, 2);
    defer m.deinit();
    try expect(m.modulus == 997);
    m.set(0, 0, 1);
    m.set(0, 1, 2);
    m.set(1, 0, 2);
    m.set(1, 1, 4);
    try expect(m.rank() == 1);

    var k = m.kernel();
    defer k.deinit();
    try expect(k.get(0, 0) == 995);
    try expect(k.get(0, 1) == 1);

    //std.debug.print("kernel = {}\n", .{k});
}
