const std = @import("std");
const twoTerm = @import("./modsym-2term.zig");
const P1List = @import("./p1list.zig").P1List;
const sparse_matrix = @import("./sparse-matrix.zig");
const dense_matrix = @import("./dense-matrix.zig");
const dims = @import("./dims.zig");
const errors = @import("../errors.zig");

pub const Sign = enum(i4) {
    minus = -1,
    zero = 0,
    plus = 1,
};

// There are 32-bit N's such that #P^1(N) does not fit in 32 bits.
// E.g., N = 2^32-1 has #P^1(N) = 7304603328 > 2^32.
// Thus the type of N isn't enough to determine the best type for Index.
// So basically in zig the interface has to be "be tediously explicit
// about these generic types".  For a nice **user experience**, have
// to write code in Javascript (say) that calls the correct version
// of one of these explicit functions, depending on some runtime
// calculation.

pub fn ManinSymbols(comptime Coeff: type, comptime Index: type) type {
    return struct {
        const Syms = @This();
        const Elt = twoTerm.Element(Index);
        const Rel = twoTerm.Relation(Index);
        const Rels = twoTerm.Relations(Index);

        allocator: *std.mem.Allocator,
        N: usize,
        sign: Sign,
        P1: P1List(Coeff),

        pub fn init(allocator: *std.mem.Allocator, N: usize, sign: Sign) !Syms {
            var P1 = try P1List(Coeff).init(allocator, @intCast(Coeff, N));
            return Syms{ .N = N, .sign = sign, .allocator = allocator, .P1 = P1 };
        }

        pub fn print(self: Syms) void {
            std.debug.print("ManinSymbols({},N={},sign={})\n", .{ Coeff, self.N, self.sign });
        }

        pub fn deinit(self: *Syms) void {
            self.P1.deinit();
        }

        // Compute dimension of this ManinSymbols space via a formula.
        // We use this as a consistency check that the presentation is correct
        // (or to detect bad primes).
        pub fn dimensionFormula(self: Syms) i64 {
            if (self.sign == Sign.zero) {
                return 2 * dims.dimensionCuspForms(i64, @intCast(i64, self.N)) + dims.dimensionEisensteinSeries(i64, @intCast(i64, self.N));
            } else {
                self.print();
                std.debug.print("Error: dimension formula not yet implemented for nonzero sign -- returning incorrect answer that does not take into account Eisenstein series.\n", .{});
                // not yet implemented -- kind of tricky...
                return dims.dimensionCuspForms(i64, @intCast(i64, self.N));
            }
        }

        // Return relations modulo the action of I for the given sign,
        // so for nonzero sign, these are:   x - sign*I*x = 0.
        pub fn relationsI(
            self: Syms,
        ) !Rels {
            var rels = Rels.init(self.allocator);
            if (self.sign == Sign.zero) {
                // no relations
                return rels;
            }
            const s: twoTerm.Coeff = if (self.sign == Sign.plus) 1 else -1;
            const n = self.P1.count();
            var i: Index = 0;
            while (i < n) : (i += 1) {
                const j = @intCast(Index, try self.P1.applyI(i));
                const a = Elt{ .coeff = 1, .index = i };
                const b = Elt{ .coeff = -s, .index = j };
                const rel = Rel{ .a = a, .b = b };
                try rels.append(rel);
            }
            return rels;
        }

        // Return the distinct relations x + S*x = 0.
        // S is an involution of the basis elements. Can think of the relations
        // as x_i + x_{j=S(i)} = 0.  So the unique relations are of the form
        // x_i + x_j = 0 with i <= j.
        pub fn relationsS(
            self: Syms,
        ) !Rels {
            var rels = Rels.init(self.allocator);
            try self.extendRelationsS(&rels);
            return rels;
        }

        fn extendRelationsS(self: Syms, rels: *Rels) !void {
            const n = self.P1.count();
            var i: Index = 0;
            while (i < n) : (i += 1) {
                const j = @intCast(Index, try self.P1.applyS(i));
                if (j < i) {
                    // We will see this same relation again when i is j.
                    continue;
                }
                const a = Elt{ .coeff = 1, .index = i };
                const b = Elt{ .coeff = 1, .index = j };
                const rel = Rel{ .a = a, .b = b };
                try rels.append(rel);
            }
        }

        pub fn relationsIandS(self: Syms) !Rels {
            var rels = try self.relationsI();
            try self.extendRelationsS(&rels);
            return rels;
        }

        // Compute map from basis manin symbols to quotient modulo
        // the S and I relations.
        pub fn twoTermQuotient(self: Syms) !twoTerm.Quotient(Index) {
            const relsIandS = try self.relationsIandS();
            defer relsIandS.deinit();
            return twoTerm.Quotient(Index).init(relsIandS);
        }

        pub fn relationMatrixMod(self: Syms, comptime T: type, p: T, quo: twoTerm.Quotient(Index)) !sparse_matrix.SparseMatrixMod(T) {

            // Because operators S and T obviously do *not* commute, we have to compute
            // *all* of the relations (up to x+T*x+T^2*x =Tx+T^2*x+x=T^2x+x+Tx)
            // and reduce them modulo quo (the 2-term relations).

            const rank = quo.rank();
            var matrix = try sparse_matrix.SparseMatrixMod(T).init(p, 0, rank, self.allocator);
            errdefer matrix.deinit();
            var row: Index = 0; // current row we're adding to matrix.
            const n: Index = quo.ngens;
            var alreadySeen = try std.bit_set.DynamicBitSet.initEmpty(n, self.allocator);
            defer alreadySeen.deinit();
            var i: Index = 0;
            while (i < n) : (i += 1) {
                if (alreadySeen.isSet(i)) {
                    continue;
                }
                try matrix.appendRow();

                // Put in the entry in new row for reduction of i-th gen via 2-term rels:
                const mod = quo.reduce(i);
                try matrix.set(row, mod.index, mod.coeff);

                // Apply T:
                const Ti = try self.P1.applyT(i);
                alreadySeen.set(Ti);
                const Ti_mod = quo.reduce(@intCast(Index, Ti));
                if (Ti_mod.coeff != 0) {
                    // important to add to the (row, col) position, not set it!
                    const c = try matrix.get(row, Ti_mod.index);
                    try matrix.set(row, Ti_mod.index, c + Ti_mod.coeff);
                }
                // Apply T^2:
                const TTi = try self.P1.applyT(Ti);
                alreadySeen.set(TTi);
                const TTi_mod = quo.reduce(@intCast(Index, TTi));
                if (TTi_mod.coeff != 0) {
                    const c = try matrix.get(row, TTi_mod.index);
                    try matrix.set(row, TTi_mod.index, c + TTi_mod.coeff);
                }
                row += 1;
            }
            return matrix;
        }

        pub fn presentation(self: Syms, comptime T: type, p: T) !Presentation(T) {
            const time = std.time.milliTimestamp;
            var t = time();
            var basis = std.ArrayList(usize).init(self.allocator);
            var quo = try self.twoTermQuotient();
            defer quo.deinit();
            var rel3 = try self.relationMatrixMod(T, p, quo);
            defer rel3.deinit();
            var columnTypes = try rel3.echelonize();
            defer columnTypes.deinit();
            std.debug.print("\ncomputed echelon = {}ms\n", .{time() - t});
            t = time();
            // write each generator in terms of the r non-pivot columns.
            const n: Index = quo.ngens;
            var r: usize = 0;
            var j: usize = 0;
            while (j < columnTypes.items.len) : (j += 1) {
                if (!columnTypes.items[j].isPivot) {
                    r += 1;
                }
            }
            var matrix = try dense_matrix.DenseMatrixMod(T).init(p, n, r, self.allocator);
            var i: Index = 0;
            while (i < n) : (i += 1) {
                const mod = quo.reduce(i);
                // i-th generator is equal to mod.coeff * [mod.index].
                if (mod.coeff == 0) {
                    // equivalent to 0
                    continue;
                }
                const columnType = columnTypes.items[mod.index];
                if (columnType.isPivot) {
                    // if mod.index is a pivot column of rel3, then we
                    // write it in terms of generators.
                    // Read off and copy over -mod.coeff * non-pivot positions of
                    // row the index of this pivot of rel3 as row of i of matrix.
                    var c: usize = 0;
                    var it = rel3.rows.items[columnType.index].map.iterator();
                    while (it.next()) |kv| {
                        const ind = kv.key_ptr.*;
                        if (!columnTypes.items[ind].isPivot) {
                            // *not* a pivot, so copy it.
                            const val = -mod.coeff * (kv.value_ptr.*);
                            try matrix.set(i, c, val);
                            c += 1;
                        }
                    }
                } else {
                    // if mod.index is not a pivot column, it is one of the free generators
                    try matrix.set(i, columnType.index, mod.coeff);
                    if (mod.coeff == 1 and basis.items.len < columnType.index + 1) {
                        try basis.append(i);
                    }
                }
            }
            if (matrix.ncols != basis.items.len) {
                std.debug.print("not even basis elements; need to do with coefficient issue?", .{});
                return errors.General.RuntimeError;
            }
            std.debug.print("\nmanage presentation = {}ms\n", .{time() - t});
            return Presentation(T){ .matrix = matrix, .basis = basis };
        }
    };
}

fn Presentation(comptime T: type) type {
    return struct {
        const P = @This();
        matrix: dense_matrix.DenseMatrixMod(T),
        basis: std.ArrayList(usize),

        pub fn deinit(self: *P) void {
            self.matrix.deinit();
            self.basis.deinit();
        }
    };
}

const test_allocator = std.testing.allocator;
const expect = std.testing.expect;

test "create a few spaces" {
    var M = try ManinSymbols(i32, u32).init(test_allocator, 11, Sign.zero);
    defer M.deinit();
    //M.print();
    var M2 = try ManinSymbols(i16, u32).init(test_allocator, 15, Sign.plus);
    defer M2.deinit();
    //M2.print();
    var M3 = try ManinSymbols(i64, u32).init(test_allocator, 234446, Sign.minus);
    defer M3.deinit();
    //M3.print();
}

test "compute relationsI" {
    var M = try ManinSymbols(i32, u32).init(test_allocator, 11, Sign.zero);
    defer M.deinit();
    var rels = try M.relationsI();
    defer rels.deinit();
    // no relations since sign is zero
    try expect(rels.items.len == 0);
}

test "compute relationsI with sign +" {
    var M = try ManinSymbols(i32, u32).init(test_allocator, 11, Sign.plus);
    defer M.deinit();
    var rels = try M.relationsI();
    defer rels.deinit();
    // many relations since sign is 1
    try expect(rels.items.len == 12);
    // std.debug.print("{s}\n", .{rels.items});
}

test "compute relationsI with sign - and composite N" {
    var M = try ManinSymbols(i32, u32).init(test_allocator, 12, Sign.minus);
    defer M.deinit();
    var rels = try M.relationsI();
    defer rels.deinit();
    // many relations since sign is not 0.
    try expect(rels.items.len == 24);
}

test "compute relationsS for N=7" {
    var M = try ManinSymbols(i16, u32).init(test_allocator, 7, Sign.zero);
    defer M.deinit();
    var rels = try M.relationsS();
    defer rels.deinit();
    // std.debug.print("\n{s}\n", .{rels.items});
    try expect(rels.items.len == 4);
}

test "compute quotient modulo two term relations for N=3, then the 3-term rels" {
    var M = try ManinSymbols(i32, u32).init(test_allocator, 3, Sign.zero);
    defer M.deinit();
    var quo = try M.twoTermQuotient();
    defer quo.deinit();
    const items = quo.mod.items;
    //std.debug.print("\nquo={}\n", .{quo});
    try expect(items.len == 4);
    // quo collapses to a x1 and x3 being basis.
    try expect(items[0].coeff == -1);
    try expect(items[0].index == 0);
    try expect(items[1].coeff == 1);
    try expect(items[1].index == 0);
    try expect(items[2].coeff == -1);
    try expect(items[2].index == 1);
    try expect(items[3].coeff == 1);
    try expect(items[3].index == 1);

    // Now the 3-term rels
    var matrix = try M.relationMatrixMod(i16, 97, quo);
    defer matrix.deinit();
    // matrix.print();
}

test "compute quotient modulo two term relations for N=3 with sign 1" {
    var M = try ManinSymbols(i32, u32).init(test_allocator, 3, Sign.plus);
    defer M.deinit();
    var quo = try M.twoTermQuotient();
    defer quo.deinit();
    // std.debug.print("\nquo={}\n", .{quo});
    // quo collapses to basis x1; x0=-x1, x2=x3=0.  x1 = eisenstein series :-)
    const items = quo.mod.items;
    try expect(items[0].coeff == -1);
    try expect(items[0].index == 0);
    try expect(items[1].coeff == 1);
    try expect(items[1].index == 0);
    try expect(items[2].coeff == 0);
    try expect(items[2].index == 0);
    try expect(items[3].coeff == 0);
    try expect(items[3].index == 0);
}

// compute rank for given space modulo the given prime p.
fn rankCheck(allocator: *std.mem.Allocator, N: usize, sign: Sign, p: i32) !usize {
    var M = try ManinSymbols(i64, u32).init(allocator, N, sign);
    defer M.deinit();
    var presentation = try M.presentation(i64, p);
    defer presentation.deinit();
    const d = M.dimensionFormula();
    const r = presentation.basis.items.len;
    if (r != d) {
        std.debug.print("\ndimension wrong for N={}; have r={} and d={}\n", .{ N, r, d });
        return errors.General.RuntimeError;
    }
    return r;
}

// test "compute some manin symbols presentations for prime N and do consistency checks on their dimension" {
//     var N: usize = 3;
//     while (N < 40) : (N += 1) {
//         _ = try rankCheck(test_allocator, N, Sign.zero, 2003);
//     }
// }

fn bench(N: usize, sign: Sign) !void {
    const time = std.time.milliTimestamp;
    const t = time();
    var M = try ManinSymbols(i64, u32).init(test_allocator, N, sign);
    defer M.deinit();
    var presentation = try M.presentation(i64, 997);
    defer presentation.deinit();
    std.debug.print("\nbench({},{}) = {}ms, r={}\n", .{ N, sign, time() - t, presentation.basis.items.len });
}

// zig test manin-symbols.zig --main-pkg-path .. -O ReleaseFast -lc
//const BENCH = false;
const BENCH = true;
test "bench" {
    if (BENCH) {
        try bench(37, Sign.zero);
        try bench(389, Sign.zero);
        try bench(5000, Sign.zero);
        try bench(5000, Sign.plus);
        try bench(5000, Sign.minus);
        try bench(5077, Sign.zero);
        try bench(5077, Sign.plus);
        try bench(10007, Sign.plus);
        try bench(100003, Sign.plus);
    }
}

test "compute presentation" {
    var M = try ManinSymbols(i64, u32).init(test_allocator, 36, Sign.zero);
    defer M.deinit();
    var presentation = try M.presentation(i64, 997);
    defer presentation.deinit();
}
