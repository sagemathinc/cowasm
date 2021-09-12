const std = @import("std");
const arith = @import("arith.zig");
const errors = @import("errors.zig");
const gcd = arith.gcd;

fn EltAndScalar(comptime T: type) type {
    return struct { u: T, v: T, s: T };
}

pub fn P1Element(comptime T: type) type {
    return struct {
        u: T,
        v: T,

        pub fn init(u: T, v: T) P1Element(T) {
            return P1Element(T){ .u = u, .v = v };
        }

        pub fn reduceMod(self: P1Element(T), N: T) !P1Element(T) {
            if (N <= 0) return errors.MathError.ValueError;
            var u = arith.mod(self.u, N);
            var v = arith.mod(self.v, N);
            return P1Element(T){ .u = u, .v = v };
        }

        pub fn normalize(self: P1Element(T), N: T, compute_s: bool) !EltAndScalar(T) {
            var reduced = try self.reduceMod(N);
            var u = reduced.u;
            var v = reduced.v;
            if (N == 1) {
                return EltAndScalar(T){ .u = u, .v = v, .s = 1 };
            }
            if (u == 0) {
                if (gcd(v, N) == 1) {
                    return EltAndScalar(T){ .u = 0, .v = 1, .s = v };
                } else {
                    return EltAndScalar(T){ .u = 0, .v = 0, .s = v };
                }
            }

            const xgcd_uN = arith.xgcd(u, N);
            const g = xgcd_uN.g;
            if (gcd(g, v) != 1) {
                // (u,v) has a common factor with N, so not elt of P1....
                return EltAndScalar(T){ .u = 0, .v = 0, .s = 0 };
            }
            var s = arith.mod(xgcd_uN.s, N);

            // Now g = s*u + t*N, so s is a "pseudo-inverse" of u mod N
            // Adjust s modulo N/g so it is coprime to N.
            if (g != 1) {
                const d = @divExact(N, g);
                while (gcd(s, N) != 1) {
                    s = @mod(s + d, N);
                }
            }

            // Multiply [u,v] by s; then [s*u,s*v] = [g,s*v] (mod N)
            u = g;
            v = @mod(s * v, N);

            var min_v: T = v;
            var min_t: T = 1;
            if (g != 1) {
                const Ng = @divExact(N, g);
                const vNg = arith.mod(v * Ng, N);
                var t: T = 1;
                var k: T = 2;
                while (k <= g) : (k += 1) {
                    v = arith.mod(v + vNg, N);
                    t = arith.mod(t + Ng, N);
                    if (v < min_v and gcd(t, N) == 1) {
                        min_v = v;
                        min_t = t;
                    }
                }
            }
            v = min_v;
            if (compute_s) {
                s = try arith.inverseMod(s * min_t, N);
                return EltAndScalar(T){ .u = u, .v = v, .s = s };
            }
            return EltAndScalar(T){ .u = u, .v = v, .s = 0 };
        }

        pub fn eql(self: P1Element(T), other: P1Element(T)) bool {
            return self.u == other.u and self.v == other.v;
        }

        pub fn sortLessThan(context: void, self: P1Element(T), right: P1Element(T)) bool {
            _ = context;
            if (self.u < right.u) return true;
            if (self.u > right.u) return false;
            return self.v < right.v;
        }
    };
}

fn P1ListType(comptime T: type) type {
    return struct {
        N: T,
        list: std.ArrayList(P1Element(T)),

        pub fn init(N: anytype, allocator: *std.mem.Allocator) !P1ListType(T) {
            const Elt = P1Element(T);
            var list = std.ArrayList(Elt).init(allocator);
            if (N == 1) {
                try list.append(Elt{ .u = 0, .v = 0 });
                return P1ListType(T){ .N = N, .list = list };
            }

            try list.append(Elt{ .u = 0, .v = 1 });
            var v: T = 0;
            while (v < N) : (v += 1) {
                try list.append(Elt{ .u = 1, .v = v });
            }

            var cmax: T = undefined;
            if (@mod(N, 2) != 0) {
                // N odd, max divisor is <= N/3
                if (@mod(N, 3) != 0) {
                    // N not a multiple of 3 either, max is N/5
                    cmax = @divFloor(N, 5);
                } else {
                    cmax = @divFloor(N, 3);
                }
            } else {
                cmax = @divFloor(N, 2);
            }

            var c: T = 2;
            while (c <= cmax) : (c += 1) {
                if (@mod(N, c) == 0) {
                    // c is a proper divisor of N.
                    var h = @divExact(N, c);
                    var g = gcd(c, h);
                    var d: T = 1;
                    while (d <= h) : (d += 1) {
                        if (gcd(d, g) == 1) {
                            var d1 = d;
                            while (gcd(d1, c) != 1) {
                                d1 += h;
                            }
                            // this normalize call dominates the runtime (not
                            // memory allocation or anything else)
                            const uv = try (Elt{ .u = c, .v = d1 }).normalize(N, false);
                            try list.append(Elt{ .u = uv.u, .v = uv.v });
                        }
                    }
                }
            }
            std.sort.sort(P1Element(T), list.items, {}, P1Element(T).sortLessThan);
            return P1ListType(T){ .N = N, .list = list };
        }

        pub fn deinit(self: P1ListType(T)) void {
            self.list.deinit();
        }
    };
}

pub fn P1List(N: anytype, allocator: *std.mem.Allocator) !P1ListType(@TypeOf(N)) {
    return P1ListType(@TypeOf(N)).init(N, allocator);
}

// while inotifywait -e close_write src/p1list.zig; do zig test src/p1list.zig ; done

const expect = std.testing.expect;
const time = std.time.milliTimestamp;

test "some basics with an element" {
    const x = P1Element(i32).init(7, 5);
    const y = try x.reduceMod(3);
    try expect(y.u == 1);
    try expect(y.v == 2);
    const n = try x.normalize(11, true);
    try expect(arith.mod(n.s * n.u, 11) == x.u);
    try expect(arith.mod(n.s * n.v, 11) == x.v);
    const n2 = try x.normalize(11, false);
    try expect(n2.s == 0);
}

test "make a P1List(1)" {
    const P = try P1List(@as(i16, 1), std.testing.allocator);
    defer P.deinit();
    try expect(P.list.items.len == 1);
    try expect(P.list.items[0].eql(P1Element(i16){ .u = 0, .v = 0 }));
}

test "make P1List(11)" {
    const P = try P1List(@as(i32, 11), std.testing.allocator);
    defer P.deinit();
    //std.debug.print("\n{s}\n", .{P.list});
    try expect(P.list.items.len == 12);
}

test "make P1(6)" {
    const P = try P1List(@as(i16, 6), std.testing.allocator);
    defer P.deinit();
    try expect(P.list.items.len == 12);
    // std.debug.print("\n{s}\n", .{P.list});
}

test "make P1(10000)" {
    const P = try P1List(@as(i32, 10000), std.testing.allocator);
    defer P.deinit();
    try expect(P.list.items.len == 18000);
    // sum all the entries of all the elements, and compare with
    // number I got from sage:
    var s: i32 = 0;
    for (P.list.items) |elt| {
        s += elt.u + elt.v;
    }
    try expect(s == 60685964);
}

fn bench1() !void {
    const t0 = time();
    var i: u32 = 0;
    while (i < 200) : (i += 1) {
        const P = try P1List(@as(i32, 10000), std.testing.allocator);
        defer P.deinit();
        try expect(P.list.items.len == 18000);
    }
    std.debug.print("\ntime={}ms\n", .{time() - t0});
}

// long time
// test "make P1(10000) 200 times" {
//     try bench1();
// }

// long time -- 3s
// test "make P1(9393939) as i64" {
//     const t0 = time();
//     const P = try P1List(@as(i64, 9393939), std.testing.allocator);
//     defer P.deinit();
//     try expect(P.list.items.len == 12963456);
//     std.debug.print("\ntime={}ms\n", .{time() - t0});
// }

// pub fn main() !void {
//     const t0 = time();
//     const P = try P1List(@as(i64, 9393939), std.testing.allocator);
//     defer P.deinit();
//     try expect(P.list.items.len == 12963456);
//     std.debug.print("\ntime={}ms\n", .{time() - t0});
// }
