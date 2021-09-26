// Inspired by src/sage/modular/modsym/relation_matrix_pyx.pyx

const std = @import("std");
const util = @import("../util.zig");
const errors = @import("../errors.zig");

pub const ArrayList = std.ArrayList;

// coeff *MUST* be -1 or 1 -- todo change to enum
pub const Coeff = i4;
pub const Index = u32;

// IMPORTANT: T=u64 it's *MUCH* slower for larger values; use
// small types when the number of generators is small.  Duh.

pub fn Element(comptime T: type) type {
    return struct {
        const Elt = @This();

        coeff: Coeff,
        index: T,

        pub fn eq(self: Elt, right: Elt) bool {
            return self.coeff == right.coeff and self.index == right.index;
        }
    };
}

pub fn Relation(comptime T: type) type {
    return struct { a: Element(T), b: Element(T) }; // the relation a + b = 0
}

pub fn Relations(comptime T: type) type {
    return ArrayList(Relation(T));
}

pub fn TwoTermQuotient(comptime T: type) type {
    return struct {
        const Quo = @This();

        mod: ArrayList(Element(T)),

        pub fn init(rels: Relations(T)) !Quo {
            var mod = try twoTermQuotient(T, rels);
            return Quo{ .mod = mod };
        }

        pub fn deinit(self: *Quo) void {
            self.mod.deinit();
        }

        pub fn print(self: Quo) void {
            std.debug.print("{}\n", .{self.mod.items});
        }
    };
}

fn twoTermQuotient(comptime T: type, rels: Relations(T)) !ArrayList(Element(T)) {
    // find largest index in any element
    var n: T = 0;
    for (rels.items) |rel| {
        if (rel.a.index + 1 > n) {
            n = rel.a.index + 1;
        }
        if (rel.b.index + 1 > n) {
            n = rel.b.index + 1;
        }
    }
    var free = try util.range(rels.allocator, T, n);
    defer free.deinit();
    var coef = try util.constantList(rels.allocator, @as(Coeff, 1), n);
    defer coef.deinit();
    var relatedToMe = try ArrayList(ArrayList(T)).initCapacity(rels.allocator, n);
    defer relatedToMe.deinit();
    var i: T = 0;
    while (i < n) : (i += 1) {
        try relatedToMe.append(ArrayList(T).init(rels.allocator));
    }
    defer {
        i = 0;
        while (i < n) : (i += 1) {
            relatedToMe.items[i].deinit();
        }
    }
    for (rels.items) |rel| {
        const c0 = rel.a.coeff * coef.items[rel.a.index];
        const c1 = rel.b.coeff * coef.items[rel.b.index];
        var died = false;
        var die: Index = undefined;
        if (c0 == 0 and c1 == 0) {
            // nothing
        } else if (c0 == 0 and c1 != 0) {
            died = true;
            die = free.items[rel.b.index];
        } else if (c1 == 0 and c0 != 0) {
            died = true;
            die = free.items[rel.a.index];
        } else if (free.items[rel.a.index] == free.items[rel.b.index]) {
            if (c0 == c1) {
                // all x_i equal to free.items[rel.a.index] must now equal to zero.
                died = true;
                die = free.items[rel.a.index];
            }
        } else { // x1 = -c1/c0 * x2
            if (c0 != 1 and c0 != -1) {
                // std.debug.print("ValueError: invalid coefficient! c0={}, c1={}", .{ c0, c1 });
                return errors.Math.ValueError;
            }
            const x = free.items[rel.a.index];
            free.items[x] = free.items[rel.b.index];
            coef.items[x] = -c1 * c0;
            for (relatedToMe.items[x].items) |j| {
                free.items[j] = free.items[x];
                coef.items[j] *= coef.items[x];
                try relatedToMe.items[free.items[rel.b.index]].append(j);
            }
            try relatedToMe.items[free.items[rel.b.index]].append(x);
        }
        if (died) {
            for (relatedToMe.items[die].items) |j| {
                free.items[j] = 0;
                coef.items[j] = 0;
            }
            free.items[die] = 0;
            coef.items[die] = 0;
        }
    }
    var mod = try ArrayList(Element(T)).initCapacity(rels.allocator, n);
    errdefer mod.deinit();
    i = 0;
    while (i < n) : (i += 1) {
        try mod.append(Element(T){ .coeff = coef.items[i], .index = free.items[i] });
    }
    return mod;
}

const allocator = std.testing.allocator;
const expect = std.testing.expect;

test "very basic example:  a+b = 0 where a=x0 and b=-x1, i.e., x0=x1." {
    const T = u16;
    var rels = Relations(T).init(allocator);
    defer rels.deinit();
    try rels.append(Relation(T){ .a = Element(T){ .coeff = 1, .index = 0 }, .b = Element(T){ .coeff = -1, .index = 1 } });
    var quo = try TwoTermQuotient(T).init(rels);
    defer quo.deinit();
    // Result is that both generators in the quotient are equal to the second one:
    try expect(quo.mod.items[0].eq(Element(T){ .coeff = 1, .index = 1 }));
    try expect(quo.mod.items[1].eq(Element(T){ .coeff = 1, .index = 1 }));
}

test "another basic example:  a+b = 0 where a=x0 and b=x1, i.e., x0=-x1." {
    const T = u16;
    var rels = Relations(T).init(allocator);
    defer rels.deinit();
    try rels.append(Relation(T){ .a = Element(T){ .coeff = 1, .index = 0 }, .b = Element(T){ .coeff = 1, .index = 1 } });
    var quo = try TwoTermQuotient(T).init(rels);
    defer quo.deinit();
    const mod = quo.mod;
    // std.debug.print("\nmod = {}\n", .{mod});
    // Result is that x0 => -x1, x1 => x1
    try expect(mod.items[0].eq(Element(T){ .coeff = -1, .index = 1 }));
    try expect(mod.items[1].eq(Element(T){ .coeff = 1, .index = 1 }));
}

test "example in which a relation dies:  a+a = 0 so x0 = 0" {
    const T = u16;
    var rels = Relations(T).init(allocator);
    defer rels.deinit();
    try rels.append(Relation(T){ .a = Element(T){ .coeff = 1, .index = 0 }, .b = Element(T){ .coeff = 1, .index = 0 } });
    var quo = try TwoTermQuotient(T).init(rels);
    defer quo.deinit();
    const mod = quo.mod;
    // std.debug.print("\nmod = {s}\n", .{mod.items});
    // Result is x0 = 0.
    try expect(mod.items[0].eq(Element(T){ .coeff = 0, .index = 0 }));
}

test "basic example from the sage doctest" {
    const T = u32;
    var rels = Relations(T).init(allocator);
    defer rels.deinit();
    // [((0,1), (1,-1)), ((1,1), (3,1)), ((2,1),(3,1)), ((4,1),(5,-1))]
    const E = Element(T);
    const R = Relation(T);
    try rels.append(R{ .a = E{ .coeff = 1, .index = 0 }, .b = E{ .coeff = -1, .index = 1 } });
    try rels.append(R{ .a = E{ .coeff = 1, .index = 1 }, .b = E{ .coeff = 1, .index = 3 } });
    try rels.append(R{ .a = E{ .coeff = 1, .index = 2 }, .b = E{ .coeff = 1, .index = 3 } });
    try rels.append(R{ .a = E{ .coeff = 1, .index = 4 }, .b = E{ .coeff = -1, .index = 5 } });
    var quo = try TwoTermQuotient(T).init(rels);
    defer quo.deinit();
    const mod = quo.mod;
    try expect(mod.items[0].eq(E{ .coeff = -1, .index = 3 }));
    try expect(mod.items[1].eq(E{ .coeff = -1, .index = 3 }));
    try expect(mod.items[2].eq(E{ .coeff = -1, .index = 3 }));
    try expect(mod.items[3].eq(E{ .coeff = 1, .index = 3 }));
    try expect(mod.items[4].eq(E{ .coeff = 1, .index = 5 }));
    try expect(mod.items[5].eq(E{ .coeff = 1, .index = 5 }));
    // std.debug.print("\nmod = {}\n", .{mod});
}

var rand = std.rand.DefaultPrng.init(0).random;
fn bench1(comptime T: type, n: Index, nrels: Index) !void {
    var rels = Relations(T).init(allocator);
    defer rels.deinit();
    var i: Index = 0;
    while (i < nrels) : (i += 1) {
        const c1: i4 = if (rand.boolean()) -1 else 1;
        // I am using Biased because the version without that **HANGS**
        // when these tests get run indirectly when running the manin-symbols.zig tests.
        // I think this is an unreported bug in the zig standard library.
        const in1: Index = rand.intRangeLessThanBiased(Index, 0, n);
        const c2: i4 = if (rand.boolean()) -1 else 1;
        const in2: Index = rand.intRangeLessThanBiased(Index, 0, n);
        try rels.append(Relation(T){ .a = Element(T){ .coeff = c1, .index = in1 }, .b = Element(T){ .coeff = c2, .index = in2 } });
    }
    var quo = try TwoTermQuotient(u32).init(rels);
    quo.deinit();
}

test "do a difficult consistency check that code doesn't crash/leak/get too slow/etc." {
    const T = u32;
    const values = [_]T{ 4, 10, 100, 200, 10000, 50000 };
    for (values) |N| {
        try bench1(T, N, @divFloor(N, 2));
    }
}

test "invalid input doesn't leak memory" {
    const T = u32;
    var rels = Relations(T).init(allocator);
    defer rels.deinit();
    // that coeff of 2 is invalid
    try rels.append(Relation(T){ .a = Element(T){ .coeff = 2, .index = 0 }, .b = Element(T){ .coeff = 1, .index = 1 } });
    var caught = false;
    _ = TwoTermQuotient(T).init(rels) catch {
        caught = true;
    };
    try expect(caught);
}

// Need -lc due to timings here
// zig test modsym-2term.zig -lc -O ReleaseFast
// Timing should be slightly better than sage, since algorithm is identical.
const BENCH = false;
test "bench -- how fast is it?" {
    if (BENCH) {
        const time = std.time.milliTimestamp;
        const values = [_]Index{ 4, 10, 100, 200, 10000, 100000, 200000, 500000 };
        for (values) |N| {
            const t = time();
            std.debug.print("\nN={}\n", .{N});
            try bench1(u32, N, @divFloor(N, 2));
            std.debug.print("{}ms\n", .{time() - t});
        }
    }
}
