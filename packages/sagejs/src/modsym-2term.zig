// Port of src/sage/modular/modsym/relation_matrix_pyx.pyx

const std = @import("std");
const util = @import("./util.zig");
const errors = @import("./errors.zig");

const List = std.ArrayList;

// coeff *MUST* be -1 or 1.
const Coeff = i4;
const Index = u32; // note that with u64 it's MUCH slower for larger values...
const Element = struct {
    coeff: Coeff,
    index: Index,
    pub fn eq(self: Element, right: Element) bool {
        return self.coeff == right.coeff and self.index == right.index;
    }
};
const Relation = struct { a: Element, b: Element }; // the relation a - b = 0
const Relations = List(Relation);

pub fn twoTermQuotient(rels: Relations) !List(Element) {
    // find largest index in any element
    const T = Index;
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
    var relatedToMe = try List(List(T)).initCapacity(rels.allocator, n);
    defer relatedToMe.deinit();
    var i: T = 0;
    while (i < n) : (i += 1) {
        try relatedToMe.append(List(T).init(rels.allocator));
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
        }
    }
    var mod = try List(Element).initCapacity(rels.allocator, n);
    errdefer mod.deinit();
    i = 0;
    while (i < n) : (i += 1) {
        try mod.append(Element{ .coeff = coef.items[i], .index = free.items[i] });
    }
    return mod;
}

const allocator = std.testing.allocator;
const expect = std.testing.expect;
test "basic example from the sage doctest" {
    var rels = Relations.init(allocator);
    defer rels.deinit();
    // [((0,1), (1,-1)), ((1,1), (3,1)), ((2,1),(3,1)), ((4,1),(5,-1))]
    try rels.append(Relation{ .a = Element{ .coeff = 1, .index = 0 }, .b = Element{ .coeff = -1, .index = 1 } });
    try rels.append(Relation{ .a = Element{ .coeff = 1, .index = 1 }, .b = Element{ .coeff = 1, .index = 3 } });
    try rels.append(Relation{ .a = Element{ .coeff = 1, .index = 2 }, .b = Element{ .coeff = 1, .index = 3 } });
    try rels.append(Relation{ .a = Element{ .coeff = 1, .index = 4 }, .b = Element{ .coeff = -1, .index = 5 } });
    const mod = try twoTermQuotient(rels);
    defer mod.deinit();
    try expect(mod.items[0].eq(Element{ .coeff = -1, .index = 3 }));
    try expect(mod.items[1].eq(Element{ .coeff = -1, .index = 3 }));
    try expect(mod.items[2].eq(Element{ .coeff = -1, .index = 3 }));
    try expect(mod.items[3].eq(Element{ .coeff = 1, .index = 3 }));
    try expect(mod.items[4].eq(Element{ .coeff = 1, .index = 5 }));
    try expect(mod.items[5].eq(Element{ .coeff = 1, .index = 5 }));
    // std.debug.print("mod = {}", .{mod});
}

var rand = std.rand.DefaultPrng.init(0).random;
fn bench1(n: Index, nrels: Index) !void {
    var rels = Relations.init(allocator);
    defer rels.deinit();
    var i: Index = 0;
    while (i < nrels) : (i += 1) {
        const c1: i4 = if (rand.boolean()) -1 else 1;
        const in1: Index = rand.intRangeLessThan(Index, 0, n);
        const c2: i4 = if (rand.boolean()) -1 else 1;
        const in2: Index = rand.intRangeLessThan(Index, 0, n);
        try rels.append(Relation{ .a = Element{ .coeff = c1, .index = in1 }, .b = Element{ .coeff = c2, .index = in2 } });
    }
    const mod = try twoTermQuotient(rels);
    mod.deinit();
}

test "bench -- as a consistency check that code doesn't crash/leak/get too slow/etc." {
    const values = [_]Index{ 4, 10, 100, 200, 10000, 50000 };
    for (values) |N| {
        try bench1(N, @divFloor(N, 2));
    }
}

test "invalid input doesn't leak memory" {
    var rels = Relations.init(allocator);
    defer rels.deinit();
    // that coeff of 2 is invalid
    try rels.append(Relation{ .a = Element{ .coeff = 2, .index = 0 }, .b = Element{ .coeff = 1, .index = 1 } });
    var caught = false;
    _ = twoTermQuotient(rels) catch {
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
            try bench1(N, @divFloor(N, 2));
            std.debug.print("{}ms\n", .{time() - t});
        }
    }
}
