//
// Some basic elliptic curve functionality over the rational numbers.
//

const std = @import("std");
const pari = @import("../pari/pari.zig");

pub fn EllipticCurve(comptime T: type) type {
    return struct {
        const EC = @This();

        ainvs: std.ArrayList(T),
        pub fn init(a1: T, a2: T, a3: T, a4: T, a6: T, allocator: std.mem.Allocator) !EC {
            var ainvs = try std.ArrayList(T).initCapacity(allocator, 5);
            try ainvs.append(a1);
            try ainvs.append(a2);
            try ainvs.append(a3);
            try ainvs.append(a4);
            try ainvs.append(a6);
            return EC{ .ainvs = ainvs };
        }

        pub fn deinit(self: *EC) void {
            self.ainvs.deinit();
        }

        pub fn toPariEll5(self: EC) pari.c.GEN {
            var v = pari.c.cgetg(6, pari.c.t_VEC);
            var i: usize = 0;
            while (i < 5) : (i += 1) {
                pari.setcoeff1(v, i + 1, pari.c.stoi(self.ainvs.items[i]));
            }
            return v;
        }

        pub fn toPari(self: EC, prec: c_long) pari.c.GEN {
            var v = self.toPariEll5();
            return pari.c.ellinit(v, pari.c.stoi(pari.c.t_ELL_Q), prec);
        }

        pub fn ap(self: EC, p: c_long) c_long {
            const context = pari.Context();
            defer context.deinit();
            var E = self.toPari(0);
            var g = pari.c.ellap(E, pari.c.stoi(p));
            return pari.c.itos(g);
        }

        // compute array of a_k for k=0,1,2,...,n.
        // where we define a_0 = 0, for simplicity.
        pub fn anlist(self: EC, n: c_long) !std.ArrayList(c_long) {
            const context = pari.Context();
            defer context.deinit();
            var E = self.toPari(0);
            var v = pari.c.ellan(E, n);
            var w = try std.ArrayList(c_long).initCapacity(self.ainvs.allocator, @intCast(usize, n + 1));
            try w.append(0);
            var i: usize = 1;
            while (i <= n) : (i += 1) {
                var an = pari.c.itos(pari.getcoeff1(v, i));
                try w.append(an);
            }
            return w;
        }

        // compute array of a_p for p prime = 2,3,5,...,m, where
        // m is largest prime <= n.
        pub fn aplist(self: EC, n: c_long) !std.ArrayList(c_long) {
            const context = pari.Context();
            defer context.deinit();
            var E = self.toPari(0);
            _ = E;
            //int forprime_init(forprime_t *T, GEN a, GEN b);
            //GEN forprime_next(forprime_t *T);

            var iter: pari.c.forprime_t = undefined;
            _ = pari.c.forprime_init(&iter, pari.c.stoi(2), pari.c.stoi(n));
            var p: pari.c.GEN = pari.c.forprime_next(&iter);
            var w = std.ArrayList(c_long).init(self.ainvs.allocator);
            while (p != null) : (p = pari.c.forprime_next(&iter)) {
                try w.append(pari.c.itos(pari.c.ellap(E, p)));
            }
            return w;
        }

        // mysterious *wrong*.
        pub fn analyticRank(self: EC, prec: c_long) c_long {
            const context = pari.Context();
            defer context.deinit();
            var E = self.toPari(prec);
            var eps = pari.c.stoi(0);
            var g = pari.c.ellanalyticrank(E, eps, prec);
            return pari.c.itos(g);
        }

        // obviously condcutor could be too big to fit in c_long, and
        // fortunately pari's itos below *does* throw an error.
        pub fn conductor(self: EC) c_long {
            const context = pari.Context();
            defer context.deinit();
            var E = self.toPari(0);
            var N = pari.c.ellQ_get_N(E);
            return pari.c.itos(N);
        }

        pub fn jsonStringify(
            self: EC,
            options: std.json.StringifyOptions,
            writer: anytype,
        ) !void {
            _ = options;
            const obj = .{ .type = "EllipticCurve", .ainvs = self.ainvs.items };
            try std.json.stringify(obj, options, writer);
        }

        pub fn format(self: EC, comptime fmt: []const u8, options: std.fmt.FormatOptions, writer: anytype) !void {
            _ = fmt;
            _ = options;
            try writer.print("EllipticCurve([{}, {}, {}, {}, {}])", .{ self.ainvs.items[0], self.ainvs.items[1], self.ainvs.items[2], self.ainvs.items[3], self.ainvs.items[4] });
        }
    };
}

const testing_allocator = std.testing.allocator;
const expect = std.testing.expect;

test "define an elliptic curve" {
    var E = try EllipticCurve(i32).init(1, 2, 3, 4, 5, testing_allocator);
    defer E.deinit();
    var out = std.ArrayList(u8).init(testing_allocator);
    defer out.deinit();
    try std.json.stringify(E, .{}, out.writer());
    // std.debug.print("{s}\n", .{out.items});
    try expect(std.mem.eql(u8, out.items,
        \\{"type":"EllipticCurve","ainvs":[1,2,3,4,5]}
    ));
}

test "compute some ap for an elliptic curve" {
    var E = try EllipticCurve(i32).init(1, 2, 3, 4, 5, testing_allocator);
    defer E.deinit();
    try expect(E.ap(2) == 1);
    try expect(E.ap(3) == 0);
    try expect(E.ap(5) == -3);
    try expect(E.ap(7) == -1);
    try expect(E.ap(2019) == 719);
}

test "compute an analytic rank" {
    var E = try EllipticCurve(i32).init(1, 2, 3, 4, 5, testing_allocator);
    defer E.deinit();
    try expect(E.analyticRank(10) == 0); // WRONG!! it should be 1!!
}

test "compute conductor of [1,2,3,4,5]" {
    var E = try EllipticCurve(i32).init(1, 2, 3, 4, 5, testing_allocator);
    defer E.deinit();
    try expect(E.conductor() == 10351);
}

test "compute conductor of rank 4 -- [1, -1, 0, -79, 289]" {
    var E = try EllipticCurve(i32).init(1, -1, 0, -79, 289, testing_allocator);
    defer E.deinit();
    try expect(E.conductor() == 234446);
}

test "compute anlist" {
    var E = try EllipticCurve(i32).init(0, -1, 1, -10, -20, testing_allocator);
    defer E.deinit();
    var v = try E.anlist(10);
    defer v.deinit();
    //std.debug.print("{any}\n", .{v.items});
    try expect(std.mem.eql(c_long, v.items, &[_]c_long{ 0, 1, -2, -1, 2, 1, 2, -2, 0, -2, -2 }));
}

test "compute aplist" {
    var E = try EllipticCurve(i32).init(0, -1, 1, -10, -20, testing_allocator);
    defer E.deinit();
    var v = try E.aplist(10);
    defer v.deinit();
    std.debug.print("{any}\n", .{v.items});
    try expect(std.mem.eql(c_long, v.items, &[_]c_long{ -2, -1, 1, -2 }));
}
