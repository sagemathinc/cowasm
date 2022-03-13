const std = @import("std");
const twoTerm = @import("./modsym-2term.zig");
const p1list = @import("./p1list.zig");
const sl2z = @import("./sl2z.zig");
const sparse_matrix = @import("./sparse-matrix.zig");
const dense_matrix = @import("./dense-matrix.zig");
const dense_vector = @import("./dense-vector.zig");
const dims = @import("./dims.zig");
const errors = @import("../errors.zig");
const heilbronn = @import("./heilbronn.zig");
const timer = @import("../timer.zig").timer;
const contfrac = @import("./contfrac.zig");
const Mat2x2 = @import("./mat2x2.zig").Mat2x2;
const reduceMod = @import("../arith.zig").mod;

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

        allocator: std.mem.Allocator,
        N: usize,
        sign: Sign,
        P1: p1list.P1List(Coeff),

        pub fn init(allocator: std.mem.Allocator, N: usize, sign: Sign) !Syms {
            var P1 = try p1list.P1List(Coeff).init(allocator, @intCast(Coeff, N));
            return Syms{ .N = N, .sign = sign, .allocator = allocator, .P1 = P1 };
        }

        pub fn format(self: Syms, comptime fmt: []const u8, options: std.fmt.FormatOptions, writer: anytype) !void {
            _ = fmt;
            _ = options;
            try writer.print("Manin Symbols for Gamma_0({}) of weight 2 with sign {}", .{ self.N, self.sign });
        }

        pub fn jsonStringify(
            self: Syms,
            options: std.json.StringifyOptions,
            writer: anytype,
        ) !void {
            _ = options;
            const obj = .{ .type = "ManinSymbols", .N = self.N, .sign = @enumToInt(self.sign) };
            try std.json.stringify(obj, options, writer);
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
                std.debug.print("{}\nError: dimension formula not yet implemented for nonzero sign -- returning incorrect answer that does not take into account Eisenstein series.\n", .{self});
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
            var alreadySeen = try std.bit_set.DynamicBitSet.initEmpty(self.allocator, n);
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

        pub fn presentation(self: Syms, comptime T: type, p: T, verbose: bool) !Presentation(Syms, T, Coeff) {
            var tm = timer(true);
            if (verbose) tm.print("computing presentation");

            var basis = std.ArrayList(usize).init(self.allocator);
            var quo2term = try self.twoTermQuotient();
            defer quo2term.deinit();

            if (verbose) tm.print("computed quotient by 2-term relations");

            var rel3 = try self.relationMatrixMod(T, p, quo2term);
            defer rel3.deinit();

            if (verbose) tm.print("computed 3-term relation matrix");
            //std.debug.print("rel3=\n{}\n", .{rel3});

            var columnTypes = try rel3.echelonize();
            defer columnTypes.deinit();

            //std.debug.print("rref(rel3)=\n{}\n", .{rel3});

            if (verbose) tm.print("computed echelon form of 3-term relation matrix");

            // write each generator in terms of the r non-pivot columns.
            const n: Index = quo2term.ngens;
            var r: usize = 0; // number of non-pivot columns (=the rank)
            var j: usize = 0;
            // As we do this, we also compute map from non-pivot column
            // positions to columns of the final presentation matrix.
            var nonpivotToPresentation = try std.ArrayList(usize).initCapacity(self.allocator, columnTypes.items.len);
            defer nonpivotToPresentation.deinit();
            nonpivotToPresentation.appendNTimesAssumeCapacity(0, columnTypes.items.len);
            while (j < columnTypes.items.len) : (j += 1) {
                if (!columnTypes.items[j].isPivot) {
                    nonpivotToPresentation.items[j] = r;
                    r += 1;
                }
            }

            //std.debug.print("rank = {}\n", .{r});

            var matrix = try dense_matrix.DenseMatrixMod(T).init(p, n, r, self.allocator);
            var i: Index = 0;
            while (i < n) : (i += 1) {
                const mod = quo2term.reduce(i);
                // i-th generator is equal to mod.coeff * [mod.index].
                // std.debug.print("{}th gen is equal to {} * [{}]\n", .{ i, mod.coeff, mod.index });
                if (mod.coeff == 0) {
                    // equivalent to 0
                    continue;
                }
                const columnType = columnTypes.items[mod.index];
                if (columnType.isPivot) {
                    // if mod.index is a pivot column of rel3, then we
                    // write it in terms of generators.
                    // Read off and copy over -mod.coeff * non-pivot positions of
                    // row the index of this pivot of rel3 as row i of matrix.
                    var it = rel3.rows.items[columnType.index].map.iterator();
                    while (it.next()) |kv| {
                        const ind = kv.key_ptr.*;
                        if (!columnTypes.items[ind].isPivot) {
                            // *not* a pivot, so copy it.
                            const val = -mod.coeff * (kv.value_ptr.*);
                            try matrix.set(i, nonpivotToPresentation.items[ind], val);
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
                std.debug.print("not enough basis elements; need to deal with coefficient issue?", .{});
                return errors.General.RuntimeError;
            }
            if (verbose) tm.print("computed presentation matrix");
            // std.debug.print("presentation matrix=\n{}\n", .{matrix});
            return Presentation(Syms, T, Coeff){ .matrix = matrix, .basis = basis, .manin_symbols = self };
        }
    };
}

pub fn Presentation(comptime ManinSymbolsType: type, comptime T: type, comptime Coeff: type) type {
    return struct {
        const P = @This();
        matrix: dense_matrix.DenseMatrixMod(T),
        basis: std.ArrayList(usize),
        manin_symbols: ManinSymbolsType,

        pub fn deinit(self: *P) void {
            self.matrix.deinit();
            self.basis.deinit();
        }

        pub fn jsonStringify(
            self: P,
            options: std.json.StringifyOptions,
            writer: anytype,
        ) !void {
            _ = options;
            const obj = .{ .type = "ManinSymbolsPresentation", .matrix = self.matrix, .basis = self.basis.items };
            try std.json.stringify(obj, options, writer);
        }

        pub fn format(self: P, comptime fmt: []const u8, options: std.fmt.FormatOptions, writer: anytype) !void {
            _ = fmt;
            _ = options;
            try writer.print("Manin Symbols presentation modulo {} of {}.", .{ self.matrix.modulus, self.manin_symbols });
        }

        // Given an element of P1(Z/NZ), write it in terms
        // of our basis.  Be sure to deinit the returned DenseVector .
        pub fn reduce(self: P, u: Coeff, v: Coeff) !dense_vector.DenseVectorMod(T) {
            const i = try self.manin_symbols.P1.index(u, v);
            return try self.matrix.getRow(i);
        }

        // Lift the ith basis vector to an element of P1(Z/NZ)
        // Returned element doesn't need to be deinit'd.
        pub fn lift(self: P, i: usize) !p1list.P1Element(Coeff) {
            const j = self.basis.items[i];
            return try self.manin_symbols.P1.get(j);
        }

        pub fn liftToSL2Z(self: P, i: usize) !sl2z.SL2ZElement(Coeff) {
            const j = self.basis.items[i];
            return try self.manin_symbols.P1.liftToSL2Z(j);
        }

        // compute dense matrix representation of the p-th Hecke operator,
        // where p is assumed prime (or you get nonsense).  This is the
        // matrix acting from the right on vectors, so v |--> v*T_p.
        pub fn heckeOperator(self: P, p: i32) !dense_matrix.DenseMatrixMod(T) {
            var h = try heilbronn.HeilbronnCremona(T).init(test_allocator, p);
            defer h.deinit();
            const n = self.basis.items.len;
            var Tp = try dense_matrix.DenseMatrixMod(T).init(self.matrix.modulus, n, n, self.manin_symbols.allocator);
            var b: usize = 0;
            while (b < n) : (b += 1) {
                var uv = try self.lift(b);
                // std.debug.print("\n\nb={}; uv={}\n", .{ b, uv });
                var i: usize = 0;
                while (i < h.count()) : (i += 1) {
                    const m2 = try h.get(i);
                    // std.debug.print("applying {}th Heilbronn matrix {}\n", .{ i, m2 });
                    const uv_m2 = uv.actionFromRight(m2);
                    // std.debug.print("uv*m2 = {}\n", .{uv_m2});
                    var v = try self.reduce(uv_m2.u, uv_m2.v);
                    // std.debug.print("reduces to {}\n", .{v});
                    defer v.deinit();
                    try Tp.addToRow(b, v);
                }
            }
            return Tp;
        }

        // compute matrix representation of the star involution
        pub fn starInvolution(self: P) !dense_matrix.DenseMatrixMod(T) {
            var S = Mat2x2(T){ .a = -1, .b = 0, .c = 0, .d = 1 };
            return try self.heilbronnOperator(S);
        }

        pub fn heilbronnOperator(self: P, m: Mat2x2(T)) !dense_matrix.DenseMatrixMod(T) {
            const n = self.basis.items.len;
            var A = try dense_matrix.DenseMatrixMod(T).init(self.matrix.modulus, n, n, self.manin_symbols.allocator);
            var b: usize = 0;
            while (b < n) : (b += 1) {
                var uv = try self.lift(b);
                const uv_m = uv.actionFromRight(m);
                var v = try self.reduce(uv_m.u, uv_m.v);
                defer v.deinit();
                try A.setRow(b, v);
            }
            return A;
        }

        // Compute the modular symbol {0, numer/denom} in terms of this presentation.
        // cf. sage/src/sage/modular/modsym/ambient.py
        // Be sure to deinit the returned value.
        pub fn modularSymbol0(self: P, numer: T, denom: T) !dense_vector.DenseVectorMod(T) {
            if (numer == 0) {
                return try dense_vector.DenseVectorMod(T).init(self.matrix.modulus, self.matrix.ncols, self.manin_symbols.allocator);
            }
            if (denom == 0) {
                return try self.reduce(0, 1);
            }
            const cf = try contfrac.convergents(T, numer, denom);
            // std.debug.print("\ncf = {}\n", .{cf});
            var sign: T = -1;
            var x = try dense_vector.DenseVectorMod(T).init(self.matrix.modulus, self.matrix.ncols, self.manin_symbols.allocator);
            var k: usize = 1;
            while (k < cf.len) : (k += 1) {
                sign *= -1;
                var y = try self.reduce(cf.q[k], sign * cf.q[k - 1]);
                defer y.deinit();
                try x.addInPlace(y, 1);
            }
            return x;
        }

        // Compute the modular symbol {a_numer/a_denom, b_numer/b_denom}
        // in terms of this presentation.  Be sure to deinit the returned value.
        pub fn modularSymbol(self: P, a_numer: T, a_denom: T, b_numer: T, b_denom: T) !dense_vector.DenseVectorMod(T) {
            var b = try self.modularSymbol0(b_numer, b_denom); // {0, b}
            var a = try self.modularSymbol0(a_numer, a_denom); // {0, a}
            // We want {a,b} = {a,0} + {0,b} = {0,b} - {0,a}
            defer a.deinit();
            try b.addInPlace(a, -1);
            return b;
        }

        // Very special case with some things hardcoded, to see "what can we do".
        // This returns the scaled plus modular symbol map: alpha |--> 10 * proj_+({oo, alpha}),
        // where proj_+ means the projection onto the plus part.  The 10 means "10 times the
        // correct normalization".  It will be correct unless the input is too large causing
        // overflow.
        pub fn modularSymbolMap11a(self: P, numer: T, denom: T) !i32 {
            // {oo,alpha} = {oo,0} + {0,alpha} ---> 1/5 + {0,alpha}, so we add 10*1/5 = 2.
            if (self.manin_symbols.N != 11) {
                std.debug.print("N={} must be 11.\n", .{self.manin_symbols.N});
                return errors.General.RuntimeError;
            }
            var v = try self.modularSymbol0(numer, denom);
            defer v.deinit();
            // projection after multiplying by 10 is dot with [  2, 5, 10],
            // which I figured out using Sage...
            var p = self.matrix.modulus;
            var proj = 2 * v.unsafeGet(0) + 5 * v.unsafeGet(1) + 10 * v.unsafeGet(2);
            var a = reduceMod(2 + proj, p);
            if (a > @divFloor(p, 2)) {
                a -= p;
            }
            return a;
        }

        fn fastModularSymbolMap0_11a(self: P, numer: T, denom: T) !i32 {
            if (numer == 0) {
                return 0;
            }
            if (denom == 0) {
                const i = try self.manin_symbols.P1.index(0, 1);
                return 2 * self.matrix.unsafeGet(i, 0) + 5 * self.matrix.unsafeGet(i, 1) + 10 * self.matrix.unsafeGet(i, 2);
            }
            var cf = try contfrac.convergents(T, numer, denom);
            var sign: T = -1;
            var s: i32 = 0;
            var k: usize = 1;
            while (k < cf.len) : (k += 1) {
                sign *= -1;
                const j = try self.manin_symbols.P1.index(cf.q[k], sign * cf.q[k - 1]);
                s = reduceMod(s + 2 * self.matrix.unsafeGet(j, 0) + 5 * self.matrix.unsafeGet(j, 1) + 10 * self.matrix.unsafeGet(j, 2), self.matrix.modulus);
            }
            return s;
        }

        pub fn fastModularSymbolMap_11a(self: P, numer: T, denom: T) !i32 {
            if (self.manin_symbols.N != 11) {
                std.debug.print("N={} must be 11.\n", .{self.manin_symbols.N});
                return errors.General.RuntimeError;
            }
            var s = try self.fastModularSymbolMap0_11a(numer, denom);
            var p = self.matrix.modulus;
            // {oo,alpha} = {oo,0} + {0,alpha} ---> 1/5 + {0,alpha}, so we add 10*1/5 = 2.
            var a = reduceMod(2 + s, p);
            if (a > @divFloor(p, 2)) {
                a -= p;
            }
            return a;
        }
    };
}

const test_allocator = std.testing.allocator;
const expect = std.testing.expect;

test "create a few spaces" {
    var M = try ManinSymbols(i32, u32).init(test_allocator, 11, Sign.zero);
    defer M.deinit();
    var M2 = try ManinSymbols(i16, u32).init(test_allocator, 15, Sign.plus);
    defer M2.deinit();
    var M3 = try ManinSymbols(i64, u32).init(test_allocator, 234446, Sign.minus);
    defer M3.deinit();
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
    //std.debug.print("matrix={}\n", .{matrix});
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
fn rankCheck(allocator: std.mem.Allocator, N: usize, sign: Sign, p: i32) !usize {
    //std.debug.print("\nrankCheck N={},sign={},p={}\n", .{ N, sign, p });
    var M = try ManinSymbols(i32, u32).init(allocator, N, sign);
    defer M.deinit();
    var presentation = try M.presentation(i32, p, false);
    defer presentation.deinit();
    const d = M.dimensionFormula();
    const r = presentation.basis.items.len;
    if (r != d) {
        std.debug.print("\nrankCheck: dimension wrong for N={},sign={},p={}; have r={} and d={}\n", .{ N, sign, p, r, d });
        return errors.General.RuntimeError;
    }
    return r;
}

test "compute some manin symbols presentations for levels N and do a consistency checks on the dimension" {
    var N: usize = 2;
    while (N <= 100) : (N += 1) {
        _ = try rankCheck(test_allocator, N, Sign.zero, 997);
    }
}

fn bench(comptime T: type, N: usize, sign: Sign) !void {
    const time = std.time.milliTimestamp;
    const t = time();
    const p = 97;
    var M = try ManinSymbols(T, u32).init(test_allocator, N, sign);
    defer M.deinit();
    var presentation = try M.presentation(T, p, true);
    defer presentation.deinit();
    const r = presentation.basis.items.len;
    if (sign == Sign.zero) {
        const d = M.dimensionFormula();
        try expect(d == r);
        std.debug.print("\nbench({},{}) = {}ms, rank={}={}\n-----------\n\n", .{ N, sign, time() - t, r, d });
    } else {
        std.debug.print("\nbench({},{}) = {}ms, rank={}\n-----------\n\n", .{ N, sign, time() - t, r });
    }
}

// zig test manin-symbols.zig --main-pkg-path .. -O ReleaseFast -lc
const BENCH = false;
//const BENCH = true;
test "bench" {
    if (BENCH) {
        try bench(i32, 37, Sign.zero);
        try bench(i32, 389, Sign.zero);
        try bench(i32, 5000, Sign.zero);
        try bench(i32, 5000, Sign.plus);
        try bench(i32, 5000, Sign.minus);
        try bench(i32, 5077, Sign.zero);
        try bench(i32, 5077, Sign.plus);
        try bench(i64, 10007, Sign.plus);
        try bench(i64, 100003, Sign.plus);
    }
}

test "compute some modular symbols {0,n/d} for level 11" {
    // I computed the example below using Sage.
    var M = try ManinSymbols(i32, u32).init(test_allocator, 11, Sign.zero);
    defer M.deinit();
    var P = try M.presentation(i32, 97, false);
    defer P.deinit();
    // {0, oo} --> (-1,0,0)
    var x0 = try P.modularSymbol0(1, 0);
    defer x0.deinit();
    try expect(std.mem.eql(i32, x0.entries.items, &[3]i32{ 96, 0, 0 }));
    // {0, 1} --> (0,0,0)
    var x0s = try P.modularSymbol0(1, 1);
    defer x0s.deinit();
    try expect(std.mem.eql(i32, x0s.entries.items, &[3]i32{ 0, 0, 0 }));
    // {0, 1/5} --> (0,0,1)
    var x1 = try P.modularSymbol0(1, 5);
    defer x1.deinit();
    try expect(std.mem.eql(i32, x1.entries.items, &[3]i32{ 0, 0, 1 }));
    // {0, 17/389} --> (0,1,0)
    var x2 = try P.modularSymbol0(17, 389);
    defer x2.deinit();
    std.debug.print("\n{0,17/389} --> {}\n", .{x2});
    try expect(std.mem.eql(i32, x2.entries.items, &[3]i32{ 0, 1, 0 }));

    // {0, 0} --> (0,0,0)
    var y0 = try P.modularSymbol(0, 1, 0, 1);
    defer y0.deinit();
    try expect(std.mem.eql(i32, y0.entries.items, &[3]i32{ 0, 0, 0 }));
    // {oo, 1/5} --> (0,0,1)
    var y1 = try P.modularSymbol(1, 0, 1, 5);
    defer y1.deinit();
    try expect(std.mem.eql(i32, y1.entries.items, &[3]i32{ 1, 0, 1 }));
    // {oo, 17/389} --> (0,1,0)
    var y2 = try P.modularSymbol(1, 0, 17, 389);
    defer y2.deinit();
    try expect(std.mem.eql(i32, y2.entries.items, &[3]i32{ 1, 1, 0 }));

    // {1/5, 17/389} --> ()
    var z = try P.modularSymbol(1, 5, 17, 389);
    defer z.deinit();
    try expect(std.mem.eql(i32, z.entries.items, &[3]i32{ 0, 1, 96 }));
}

fn modularSymbolBenchmark(comptime T: type, N: usize, sign: Sign, B: usize) !void {
    const time = std.time.milliTimestamp;
    const t = time();
    const p = 997;
    var M = try ManinSymbols(T, u32).init(test_allocator, N, sign);
    defer M.deinit();
    var P = try M.presentation(T, p, false);
    defer P.deinit();
    var i: T = 1;
    var j: T = 0;
    while (i < B) : (i += 1) {
        while (j < B) : (j += 1) {
            var v = try P.modularSymbol(1, 0, i, j);
            v.deinit();
        }
    }
    std.debug.print("\nmodularSymbolBenchmark(N={},sign={},B={}) --> {}ms\n\n", .{ N, sign, B, time() - t });
}

const BENCHms = false;
//const BENCHms = true;
test "bench modularSymbol" {
    if (BENCHms) {
        try modularSymbolBenchmark(i32, 11, Sign.zero, 100);
        try modularSymbolBenchmark(i32, 11, Sign.zero, 1000);
        try modularSymbolBenchmark(i32, 11, Sign.zero, 10000);
        try modularSymbolBenchmark(i32, 11, Sign.zero, 100000);
        try modularSymbolBenchmark(i32, 11, Sign.plus, 1000);
        try modularSymbolBenchmark(i32, 37, Sign.zero, 1000);
        try modularSymbolBenchmark(i32, 389, Sign.plus, 1000);
        try modularSymbolBenchmark(i32, 389, Sign.plus, 10000);
    }
}

test "compute full modular symbol map for 11a (scaled by 10)" {
    const p = 997;
    var M = try ManinSymbols(i32, u32).init(test_allocator, 11, Sign.zero);
    defer M.deinit();
    var P = try M.presentation(i32, p, false);
    defer P.deinit();
    try expect((try P.modularSymbolMap11a(0, 1)) == 2);

    // do a benchmark:
    const time = std.time.milliTimestamp;
    const t = time();
    var i: i32 = 0;
    var s: i32 = 0;
    const B: i32 = 100;
    while (i < B) : (i += 1) {
        var j: i32 = 1;
        while (j < B) : (j += 1) {
            s += try P.modularSymbolMap11a(i, j);
        }
    }
    // SAGE: for B = 1000 it is 115103; for B = 100 it is 1160.
    try expect(s == 1160);
    std.debug.print("\ns={}\n", .{s});
    std.debug.print("\nmodularSymbolMap11a bench 1: --> {}ms\n\n", .{time() - t});
}

test "FAST/Optimized - compute full modular symbol map for 11a (scaled by 10)" {
    const p = 997;
    var M = try ManinSymbols(i32, u32).init(test_allocator, 11, Sign.zero);
    defer M.deinit();
    var P = try M.presentation(i32, p, false);
    defer P.deinit();
    try expect((try P.fastModularSymbolMap_11a(0, 1)) == 2);

    // do a benchmark:
    const time = std.time.milliTimestamp;
    const t = time();
    var i: i32 = 0;
    var s: i32 = 0;
    const B: i32 = 2000;
    while (i < B) : (i += 1) {
        var j: i32 = 1;
        while (j < B) : (j += 1) {
            s += try P.fastModularSymbolMap_11a(i, j);
        }
    }
    // SAGE: for B = 1000 it is 115103; for B = 100 it is 1160.
    //try expect(s == 115103);
    std.debug.print("\ns={}\n", .{s});
    std.debug.print("\nmodularSymbolMap11a bench 1: --> {}ms\n\n", .{time() - t});
}
