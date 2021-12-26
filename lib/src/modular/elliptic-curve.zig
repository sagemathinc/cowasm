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

        pub fn toPariEll5(self: EC) pari.clib.GEN {
            var v = pari.clib.cgetg(6, pari.clib.t_VEC);
            var i: usize = 0;
            while (i < 5) : (i += 1) {
                pari.setcoeff1(v, i + 1, pari.clib.stoi(self.ainvs.items[i]));
            }
            return v;
        }

        pub fn toPari(self: EC, prec: c_long) pari.clib.GEN {
            var v = self.toPariEll5();
            return pari.clib.ellinit(v, null, prec);
        }

        pub fn ap(self: EC, p: c_long) c_long {
            const context = pari.Context();
            defer context.deinit();
            var e = self.toPari(0);
            var g = pari.clib.ellap(e, pari.clib.stoi(p));
            return pari.clib.itos(g);
        }

        pub fn analyticRank(self: EC, bitPrecision: c_long) c_long {
            const context = pari.Context();
            defer context.deinit();
            var e = self.toPari(bitPrecision); // TODO -- this precision is *WRONG*
            var g = pari.clib.ellanalyticrank_bitprec(e, null, bitPrecision);
            return pari.clib.itos(g);
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
