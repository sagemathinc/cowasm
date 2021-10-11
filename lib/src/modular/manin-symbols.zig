const std = @import("std");
const twoTerm = @import("./modsym-2term.zig");
const P1List = @import("./p1list.zig").P1List;
const SparseMatrixMod = @import("./sparse-matrix.zig").SparseMatrixMod;
const dims = @import("./dims.zig");

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

        pub fn relationMatrixMod(self: Syms, comptime T: type, p: T, quo: twoTerm.Quotient(Index)) !SparseMatrixMod(T) {

            // Because S and T obviously do *not* commute, we have to compute
            // *all* of the relations (up to x+T*x+T^2*x =Tx+T^2*x+x=T^2x+x+Tx)
            // and reduce them modulo quo (the 2-term relations).

            const rank = quo.rank();
            var matrix = try SparseMatrixMod(T).init(p, 0, rank, self.allocator);
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
                    // important to add to the (row, col) positiion, not set it!
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
    var quo = try M.twoTermQuotient();
    defer quo.deinit();
    var matrix = try M.relationMatrixMod(i64, p, quo);
    defer matrix.deinit();
    var pivots = try matrix.echelonize();
    defer pivots.deinit();
    const r = matrix.ncols - pivots.items.len;
    const d = M.dimensionFormula();
    if (r != d) {
        std.debug.print("\nquo={}\n", .{quo});
        std.debug.print("\ndimension wrong for N={}; have r={} and d={}\n", .{ N, r, d });
    }
    return r;
}

test "compute some manin symbols presentations for prime N and do consistency checks on their dimension" {
    var N: usize = 3;
    while (N < 40) : (N += 1) {
        _ = try rankCheck(test_allocator, N, Sign.zero, 2003);
    }
    //     try expect(1 == try rankCheck(test_allocator, 3, Sign.zero, 997));
    //     try expect(1 + 2 == try rankCheck(test_allocator, 11, Sign.zero, 997));
    //     try expect(5 == try rankCheck(test_allocator, 12, Sign.zero, 997));
    //     try expect(5 == try rankCheck(test_allocator, 15, Sign.zero, 997));
    //     try expect(9 == try rankCheck(test_allocator, 33, Sign.zero, 997));
    //     try expect(1 + 4 == try rankCheck(test_allocator, 37, Sign.zero, 997));
    //var r = try rankCheck(test_allocator, 389, Sign.zero, 997);
    //std.debug.print("\nr={}\n",.{r});
    //try expect(1 + 2*32 == try rankCheck(test_allocator, 389, Sign.zero, 997));
}

fn bench(N: usize, sign: Sign) !void {
    const time = std.time.milliTimestamp;
    const t = time();
    const r = try rankCheck(test_allocator, N, sign, 997);
    std.debug.print("\nbench({},{}) = {}ms, r={}\n", .{ N, sign, time() - t, r });
}

// zig test manin-symbols.zig --main-pkg-path .. -O ReleaseFast
const DEBUG = false;
//const DEBUG = true;
test "bench" {
    if (DEBUG) {
        try bench(37, Sign.zero);
        try bench(389, Sign.zero);
        try bench(5000, Sign.zero);
        try bench(5000, Sign.plus);
        try bench(5000, Sign.minus);
        try bench(5077, Sign.zero);
        try bench(5077, Sign.plus);
        try bench(10007, Sign.plus);
        // try bench(100003, Sign.plus);
    }
}
