const std = @import("std");
const arith = @import("../arith.zig");
const errors = @import("../errors.zig");
const sl2z = @import("./sl2z.zig");
const Mat2x2 = @import("./mat2x2.zig").Mat2x2;
const gcd = arith.gcd;

fn EltAndScalar(comptime T: type) type {
    return struct { u: T, v: T, s: T };
}

pub fn P1Element(comptime T: type) type {
    return struct {
        const Elt = @This();
        u: T,
        v: T,

        pub fn init(u: T, v: T) Elt {
            return Elt{ .u = u, .v = v };
        }

        pub fn print(self: Elt) void {
            std.debug.print("[{},{}]", .{ self.u, self.v });
        }

        pub fn reduceMod(self: Elt, N: T) !Elt {
            if (N <= 0) return errors.Math.ValueError;
            var u = arith.mod(self.u, N);
            var v = arith.mod(self.v, N);
            return Elt{ .u = u, .v = v };
        }

        pub fn normalize(self: Elt, N: T, compute_s: bool) !EltAndScalar(T) {
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

        pub fn eql(self: Elt, other: Elt) bool {
            return self.u == other.u and self.v == other.v;
        }

        pub fn sortLessThan(context: void, lhs: Elt, rhs: Elt) bool {
            _ = context;
            if (lhs.u < rhs.u) return true;
            if (lhs.u > rhs.u) return false;
            return lhs.v < rhs.v;
        }

        pub fn compareFn(context: void, lhs: Elt, rhs: Elt) std.math.Order {
            _ = context;
            if (lhs.u < rhs.u) return std.math.Order.lt;
            if (lhs.u > rhs.u) return std.math.Order.gt;
            if (lhs.v < rhs.v) {
                return std.math.Order.lt;
            }
            if (lhs.v == rhs.v) {
                return std.math.Order.eq;
            }
            return std.math.Order.gt;
        }

        pub fn actionFromRight(self: Elt, m2: Mat2x2(T)) Elt {
            return Elt{ .u = self.u * m2.a + self.v * m2.c, .v = self.u * m2.b + self.v * m2.d };
        }
    };
}

pub fn P1List(comptime T: type) type {
    const IndexAndScalar = struct { i: usize, s: T };
    return struct {
        const P1 = @This();
        const Elt = P1Element(T);
        N: T,
        list: std.ArrayList(Elt),

        pub fn init(allocator: std.mem.Allocator, N: T) !P1 {
            var list = std.ArrayList(Elt).init(allocator);
            if (N == 1) {
                try list.append(Elt{ .u = 0, .v = 0 });
                return P1{ .N = N, .list = list };
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
            std.sort.sort(Elt, list.items, {}, Elt.sortLessThan);
            return P1{ .N = N, .list = list };
        }

        pub fn deinit(self: P1) void {
            self.list.deinit();
        }

        pub fn count(self: P1) usize {
            return self.list.items.len;
        }

        pub fn print(self: P1) void {
            var i: usize = 0;
            std.debug.print("P1({}): [", .{self.N});
            while (i < self.list.items.len) : (i += 1) {
                if (i > 0) {
                    std.debug.print(", ", .{});
                }
                self.list.items[i].print();
            }
            std.debug.print("]\n", .{});
        }

        pub fn normalize(self: P1, u: T, v: T) !Elt {
            const elt = Elt.init(u, v);
            const n = try elt.normalize(self.N, false);
            return Elt.init(n.u, n.v);
        }

        pub fn normalizeWithScalar(self: P1, u: T, v: T) !EltAndScalar(T) {
            const elt = Elt.init(u, v);
            return elt.normalize(self.N, true);
        }

        // (u,v) assumed already normalized.
        pub fn indexOfNormalized(self: P1, u: T, v: T) !usize {
            if (self.N <= 1) {
                return 0;
            }
            // some special cases; these could be deleted...
            if (u == 1) { // (1, v)
                return @intCast(usize, v) + 1;
            }
            if (u == 0) {
                if (v == 0) {
                    return errors.Math.ValueError;
                }
                // (0, 1)
                return 0;
            }
            // general case, using binary search
            const key = Elt{ .u = u, .v = v };
            return std.sort.binarySearch(Elt, key, self.list.items, {}, Elt.compareFn) orelse {
                return errors.Math.ValueError;
            };
        }

        pub fn index(self: P1, u: T, v: T) !usize {
            if (self.N <= 1) {
                return @as(usize, 0);
            }
            // Normalize u and v, then find their position in our sorted list
            // of elements of P1.
            const uv = try self.normalize(u, v);
            return self.indexOfNormalized(uv.u, uv.v);
        }

        pub fn indexAndScalar(self: P1, u: T, v: T) !IndexAndScalar {
            const z = try self.normalizeWithScalar(u, v);
            const i = try self.indexOfNormalized(z.u, z.v);
            return IndexAndScalar{ .i = i, .s = z.s };
        }

        pub fn get(self: P1, i: usize) !Elt {
            if (i >= self.list.items.len) {
                return errors.General.IndexError;
            }
            return self.list.items[i];
        }

        pub fn liftToSL2Z(self: P1, i: usize) !sl2z.SL2ZElement(T) {
            const elt = try self.get(i);
            return sl2z.liftToSL2Z(T, elt.u, elt.v, self.N) catch {
                unreachable;
            };
        }

        // Apply the matrix [-1,0;0,1] to the `i`'th element of P1.
        pub fn applyI(self: P1, i: usize) !usize {
            const elt = try self.get(i);
            return self.index(-elt.u, elt.v);
        }

        // Apply the matrix [0,-1;1,0] to the `i`'th element of P1.
        pub fn applyS(self: P1, i: usize) !usize {
            const elt = try self.get(i);
            return self.index(-elt.v, elt.u);
        }
        // Apply the matrix [0,1;-1,-1] to the `i`'th element of P1.
        pub fn applyT(self: P1, i: usize) !usize {
            const elt = try self.get(i);
            return self.index(elt.v, -elt.u - elt.v);
        }
    };
}

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
    const P = try P1List(i16).init(std.testing.allocator, 1);
    defer P.deinit();
    try expect(P.list.items.len == 1);
    try expect(P.list.items[0].eql(P1Element(i16){ .u = 0, .v = 0 }));
}

test "make P1List(11)" {
    const P = try P1List(i32).init(std.testing.allocator, 11);
    defer P.deinit();
    //std.debug.print("\n{s}\n", .{P.list});
    try expect(P.list.items.len == 12);
}

test "make P1(6)" {
    const P = try P1List(i16).init(std.testing.allocator, 6);
    defer P.deinit();
    try expect(P.list.items.len == 12);
    // std.debug.print("\n{s}\n", .{P.list});
}

test "make P1(10000)" {
    const P = try P1List(i32).init(std.testing.allocator, 10000);
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

test "normalize" {
    const P = try P1List(i32).init(std.testing.allocator, 20);
    defer P.deinit();
    const x = try P.normalize(7, 15);
    try expect(x.u == 1);
    try expect(x.v == 5);
    const y = try P.normalizeWithScalar(7, 15);
    try expect(y.u == 1);
    try expect(y.v == 5);
    try expect(y.s == 7);
}

test "index of element in the sorted list" {
    const P = try P1List(i32).init(std.testing.allocator, 120);
    defer P.deinit();
    const i = try P.index(1, 99);
    try expect(i == 100);
    // Also with the scalar
    const z = try P.indexAndScalar(1, 99);
    try expect(z.i == 100);
    try expect(z.s == 1);
    // And another with a more interesting scalar
    const z2 = try P.indexAndScalar(7, 7 * 99);
    try expect(z2.i == 100);
    try expect(z2.s == 7);
}

test "compute P1(N) for N up to 500 and add up the counts -- good double check that things are correct" {
    var s: usize = 0;
    var N: i32 = 1;
    const t0 = time();
    while (N <= 500) : (N += 1) {
        const P = try P1List(i32).init(std.testing.allocator, N);
        defer P.deinit();
        s += P.count();
    }
    try expect(s == 190272);
    // Also, this better not take very long! (should be around 100ms)
    //std.debug.print("\n{}\n", .{time() - t0});
    try expect(time() - t0 < 1000);
}

test "getting items from P1" {
    const N: i32 = 100;
    const P = try P1List(i32).init(std.testing.allocator, N);
    defer P.deinit();
    const i = try P.index(1, 17);
    const elt = try P.get(i);
    try expect(elt.u == 1);
    try expect(elt.v == 17);

    // testing for out-of-bounds -- kind of awkard
    var caught = false;
    _ = P.get(1000) catch |err| {
        try expect(err == errors.General.IndexError);
        caught = true;
    };
    try expect(caught);
}

test "test liftToSL2Z for all elements of P1(1000) -- add upper left entry" {
    const N: i32 = 1000;
    const P = try P1List(i32).init(std.testing.allocator, N);
    defer P.deinit();
    var i: usize = 0;
    var s: i32 = 0;
    while (i < P.count()) : (i += 1) {
        const m = try P.liftToSL2Z(i);
        s += m.a;
    }
    try expect(s == 161);
    // 161 computed with sage
    //    P=P1List(1000); sum([P.lift_to_sl2z(i)[0] for i in range(len(P))])
}

test "applyI, applyS, applyT to elements of P1(10)" {
    const N: i32 = 10;
    const P = try P1List(i32).init(std.testing.allocator, N);
    defer P.deinit();
    // from Sage:  P = P1List(10); [P.apply_I(n) for n in range(len(P))]
    const correctI = [_]usize{ 0, 1, 10, 9, 8, 7, 6, 5, 4, 3, 2, 15, 14, 13, 12, 11, 16, 17 };
    const correctS = [_]usize{ 1, 0, 10, 15, 4, 14, 16, 12, 8, 11, 2, 9, 7, 17, 5, 3, 6, 13 };
    const correctT = [_]usize{ 10, 0, 9, 14, 3, 13, 17, 11, 7, 15, 1, 8, 6, 16, 4, 2, 5, 12 };
    var i: usize = 0;
    while (i < P.count()) : (i += 1) {
        try expect((try P.applyI(i)) == correctI[i]);
        try expect((try P.applyS(i)) == correctS[i]);
        try expect((try P.applyT(i)) == correctT[i]);
    }
}

fn bench1() !void {
    const t0 = time();
    var i: u32 = 0;
    while (i < 200) : (i += 1) {
        const P = try P1List(i32).init(std.testing.allocator, 10000);
        defer P.deinit();
        try expect(P.list.items.len == 18000);
    }
    std.debug.print("\ntime={}ms\n", .{time() - t0});
}

// long time
// test "make P1(10000) 200 times" {
//     try bench1();
// }

fn bench2(comptime T: type, N: T, verbose: bool) !usize {
    const t0 = time();
    const P = try P1List(T).init(std.testing.allocator, N);
    defer P.deinit();
    var i: usize = 0;
    var s: usize = 0;
    while (i < P.count()) : (i += 1) {
        s += try P.applyT(i);
    }
    if (verbose) {
        std.debug.print("\nN={}, time={}ms, s={}\n", .{ N, time() - t0, s });
    }
    return s;
}

test "small bench2" {
    try expect((try bench2(i32, 1000, false)) == 1619100);
}

// test "bench2" {
//     try bench2(i32, 389, false);
//     try bench2(i32, 1000, false);
//     try bench2(i32, 10000, true);
//     try bench2(i64, 100000, true);
//     try bench2(i64, 1000000, true);
// }

// long time -- 3s
// test "make P1(9393939) as i64" {
//     const t0 = time();
//     const P = try P1List(i64).init(std.testing.allocator, 9393939);
//     defer P.deinit();
//     try expect(P.list.items.len == 12963456);
//     std.debug.print("\ntime={}ms\n", .{time() - t0});
// }

// pub fn main() !void {
//     const t0 = time();
//     const P = try P1List(i64).init(std.testing.allocator, 9393939);
//     defer P.deinit();
//     try expect(P.list.items.len == 12963456);
//     std.debug.print("\ntime={}ms\n", .{time() - t0});
// }

