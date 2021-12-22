//
// Some basic elliptic curve functionality over the rational numbers.
//

const std = @import("std");
const pari = @import("../pari/pari.zig");

pub fn EllipticCurve(comptime T: type) type {
    return struct {
        const EC = @This();

        a1: T,
        a2: T,
        a3: T,
        a4: T,
        a6: T,

        pub fn init(a1: T, a2: T, a3: T, a4: T, a6: T) EC {
            return EC{ .a1 = a1, .a2 = a2, .a3 = a3, .a4 = a4, .a6 = a6 };
        }

        pub fn toPariEll5(self: EC) pari.clib.GEN {
            var v = pari.clib.cgetg(6, pari.clib.t_VEC);
            pari.setcoeff1(v, 1, pari.clib.stoi(self.a1));
            pari.setcoeff1(v, 2, pari.clib.stoi(self.a2));
            pari.setcoeff1(v, 3, pari.clib.stoi(self.a3));
            pari.setcoeff1(v, 4, pari.clib.stoi(self.a4));
            pari.setcoeff1(v, 5, pari.clib.stoi(self.a6));
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
            var e = self.toPari(0);
            var g = pari.clib.ellanalyticrank_bitprec(e, null, bitPrecision);
            return pari.clib.itos(g);
        }

        pub fn jsonStringify(
            self: EC,
            options: std.json.StringifyOptions,
            writer: anytype,
        ) !void {
            _ = options;
            const obj = .{ .type = "EllipticCurve", .a1 = self.a1, .a2 = self.a2, .a3 = self.a3, .a4 = self.a4, .a6 = self.a6 };
            try std.json.stringify(obj, options, writer);
        }

        pub fn format(self: EC, comptime fmt: []const u8, options: std.fmt.FormatOptions, writer: anytype) !void {
            _ = fmt;
            _ = options;
            try writer.print("EllipticCurve([{}, {}, {}, {}, {}])", .{ self.a1, self.a2, self.a3, self.a4, self.a6 });
        }
    };
}

const testing_allocator = std.testing.allocator;
const expect = std.testing.expect;

test "define an elliptic curve" {
    var E = EllipticCurve(i32).init(1, 2, 3, 4, 5);
    var out = std.ArrayList(u8).init(testing_allocator);
    defer out.deinit();
    try std.json.stringify(E, .{}, out.writer());
    try expect(std.mem.eql(u8, out.items,
        \\{"type":"EllipticCurve","a1":1,"a2":2,"a3":3,"a4":4,"a6":5}
    ));
}

test "compute some ap for an elliptic curve" {
    var e = EllipticCurve(i32).init(1, 2, 3, 4, 5);
    try expect(e.ap(2) == 1);
    try expect(e.ap(3) == 0);
    try expect(e.ap(5) == -3);
    try expect(e.ap(7) == -1);
    try expect(e.ap(2019) == 719);
}
