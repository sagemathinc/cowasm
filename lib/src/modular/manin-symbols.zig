const std = @import("std");
const twoTerm = @import("./modsym-2term.zig");
const P1List = @import("./p1list.zig").P1List;
const SparseMatrixMod = @import("./sparse-matrix.zig").SparseMatrixMod;

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

        pub fn relationMatrixModP(self: Syms, p: Coeff, quo: twoTerm.Quotient(Index)) !SparseMatrixMod(Coeff) {
            defer quo.deinit();
            var matrix = SparseMatrixMod(Coeff).init(p, 0, quo.rank);
            var row: usize = 0;
            var n = self.P1.count();
            var alreadySeen = std.bit_set.DynamicBitSet.initEmpty(n, self.allocator);
            defer alreadySeen.deinit();
            var i: usize = 0;
            while (i < n) : (i += 1) {
                if (alreadySeen.isSet(i)) {
                    continue;
                }
                const Ti = try self.P1.applyT(i);
                alreadySeen.set(Ti);
                const TTi = try self.P1.applyT(Ti);
                alreadySeen.set(TTi);
                try matrix.appendRow();
                try matrix.set(row, i, 1);
                const rTi = quo.reduce(Ti);
                try matrix.set(row, rTi.index, rTi.coeff);
                const rTTi = quo.reduce(TTi);
                try matrix.set(row, rTTi.index, rTTi.coeff);
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
    M.print();
    var M2 = try ManinSymbols(i16, u32).init(test_allocator, 15, Sign.plus);
    defer M2.deinit();
    M2.print();
    var M3 = try ManinSymbols(i64, u32).init(test_allocator, 234446, Sign.minus);
    defer M3.deinit();
    M3.print();
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

test "compute quotient modulo two term relations for N=3" {
    var M = try ManinSymbols(i32, u32).init(test_allocator, 3, Sign.zero);
    defer M.deinit();
    var quo = try M.twoTermQuotient();
    defer quo.deinit();
    const items = quo.mod.items;
    //std.debug.print("\nquo={}\n", .{quo});
    try expect(items.len == 4);
    // quo collapses to a x1 and x3 being basis.
    try expect(items[0].coeff == -1);
    try expect(items[0].index == 1);
    try expect(items[1].coeff == 1);
    try expect(items[1].index == 1);
    try expect(items[2].coeff == -1);
    try expect(items[2].index == 3);
    try expect(items[3].coeff == 1);
    try expect(items[3].index == 3);
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
    try expect(items[0].index == 1);
    try expect(items[1].coeff == 1);
    try expect(items[1].index == 1);
    try expect(items[2].coeff == 0);
    try expect(items[2].index == 0);
    try expect(items[3].coeff == 0);
    try expect(items[3].index == 0);
}
