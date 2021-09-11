const std = @import("std");
const arith = @import("arith.zig");
const errors = @import("errors.zig");

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

        pub fn normalize(self: P1Element(T), N: T) !EltAndScalar(T) {
            var reduced = try self.reduceMod(N);
            var u = reduced.u;
            var v = reduced.v;
            if (N == 1) {
                return EltAndScalar(T){ .u = u, .v = v, .s = 1 };
            }
            if (u == 0) {
                if (arith.gcd(v, N) == 1) {
                    return EltAndScalar(T){ .u = 0, .v = 1, .s = v };
                } else {
                    return EltAndScalar(T){ .u = 0, .v = 0, .s = v };
                }
            }

            const xgcd_uN = arith.xgcd(u, N);
            const g = xgcd_uN.g;
            if (arith.gcd(g, v) != 1) {
                // (u,v) has a common factor with N, so not elt of P1....
                return EltAndScalar(T){ .u = 0, .v = 0, .s = 0 };
            }
            var s = arith.mod(xgcd_uN.s, N);

            // Now g = s*u + t*N, so s is a "pseudo-inverse" of u mod N
            // Adjust s modulo N/g so it is coprime to N.
            if (g != 1) {
                const d = @divExact(N, g);
                while (arith.gcd(s, N) != 1) {
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
                    if (v < min_v and arith.gcd(t, N) == 1) {
                        min_v = v;
                        min_t = t;
                    }
                }
            }
            v = min_v;
            s = try arith.inverseMod(s * min_t, N);

            return EltAndScalar(T){ .u = u, .v = v, .s = s };
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
            // Enumerate the elements of P1.
            // TODO -- this is fake for now!  only for primes
            try list.append(Elt{ .u = 0, .v = 1 });
            var v: T = 0;
            while (v < N) : (v += 1) {
                try list.append(Elt{ .u = 1, .v = v });
            }
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

const expect = std.testing.expect;

test "some basics with an element" {
    const x = P1Element(i32).init(7, 5);
    const y = try x.reduceMod(3);
    try expect(y.u == 1);
    try expect(y.v == 2);
    const n = try x.normalize(11);
    try expect(arith.mod(n.s * n.u, 11) == x.u);
    try expect(arith.mod(n.s * n.v, 11) == x.v);
}

test "make a P1List" {
    const P = try P1List(@as(i32, 11), std.testing.allocator);
    defer P.deinit();
    //std.debug.print("\n{s}\n", .{P.list});
    try expect(P.list.items.len == 12);
}
