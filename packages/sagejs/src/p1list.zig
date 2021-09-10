const arith = @import("arith.zig");
const errors = @import("errors.zig");

fn EltAndScalar(comptime T: type) type {
    return struct { u: T, v: T, s: T };
}

pub fn P1Element(comptime T: type) type {
    return struct {
        u: T,
        v: T,

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

            //TODO!
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

pub fn P1ListSize(N: anytype) @TypeOf(N) {
    return N + 1;
}

//fn P1ListType(comptime T: type) type {
//    return struct {
//        N: T,
//    };
//}

//pub fn P1List(comptime T: type, comptime N: T) [P1ListSize(N)]P1Element(T) {
//    const m: usize = P1ListSize(N);
//    const v = [_]P1Element(T){P1Element(T){ .u = 0, .v = 0 }} ** m;
//    return v;
//}
