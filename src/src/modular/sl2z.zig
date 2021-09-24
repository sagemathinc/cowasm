const errors = @import("../errors.zig");
const arith = @import("../arith.zig");
const xgcd = arith.xgcd;
const gcd = arith.gcd;

pub fn SL2ZElement(comptime T: type) type {
    return struct {
        a: T,
        b: T,
        c: T,
        d: T,
        pub fn eql(self: SL2ZElement(T), other: SL2ZElement(T)) bool {
            return self.a == other.a and self.b == other.b and self.c == other.c and self.d == other.d;
        }
    };
}

// Lift a pair `(c, d)` to an element of `SL(2, \ZZ)`.
// `(c,d)` is assumed to be an element of P1(Z/NZ)
// Computes 2x2 matrix, with determinant 1 and integer
// entries, such that `c=c'` (mod `N`) and `d=d'` (mod `N`).
// **All arithmetic though is with the type T, so
// overflow could happen, of course. **
pub fn liftToSL2Z(comptime T: type, _c: T, _d: T, N: T) !SL2ZElement(T) {
    const SL2 = SL2ZElement(T);
    if (N == 1) {
        return SL2{ .a = 1, .b = 0, .c = 0, .d = 1 };
    }
    var c = _c;
    var d = _d;
    if (c == 0) {
        if (d == 1) {
            return SL2{ .a = 1, .b = 0, .c = 0, .d = 1 };
        }
        if (d == N - 1) {
            return SL2{ .a = -1, .b = 0, .c = 0, .d = -1 };
        }
        c = N;
    }

    const v = xgcd(c, d);
    var g = v.g;
    if (g == 1) {
        return SL2{ .a = v.t, .b = -v.s, .c = c, .d = d };
    }

    // compute prime-to-d part of m.
    var m = c;
    while (true) {
        g = gcd(m, d);
        if (g == 1) break;
        m = @divExact(m, g);
    }

    // compute prime-to-N part of m.
    while (true) {
        g = gcd(m, N);
        if (g == 1) break;
        m = @divExact(m, g);
    }

    d += N * m;
    const w = xgcd(c, d);
    g = w.g;
    if (g != 1) {
        return errors.Math.ValueError;
    }
    return SL2{ .a = w.t, .b = -w.s, .c = c, .d = d };
}

const std = @import("std");
const expect = std.testing.expect;
const mod = arith.mod;
//const time = std.time.milliTimestamp;

test "a basic example from the sage docs" {
    const m = try liftToSL2Z(i32, 2, 6, 11);
    try expect(m.eql(SL2ZElement(i32){ .a = 1, .b = 8, .c = 2, .d = 17 }));
}

fn testLiftAll(comptime N: anytype) !void {
    const T = @TypeOf(N);
    var c: T = 0;
    while (c < N) : (c += 1) {
        var d: T = 0;
        while (d < N) : (d += 1) {
            if (gcd(gcd(c, N), d) == 1) {
                const m = try liftToSL2Z(T, c, d, N);
                // check conditions
                try expect(m.a * m.d - m.b * m.c == 1);
                try expect(mod(m.c, N) == c);
                try expect(mod(m.d, N) == d);
            }
        }
    }
}

test "lift all elements for various N" {
    //const t = time();
    try testLiftAll(@as(i16, 10));
    try testLiftAll(@as(i32, 100));
    try testLiftAll(@as(i64, 500));
    //std.debug.print("time={}\n", .{time() - t});
}

test "get an error on invalid input" {
    var err = false;
    _ = liftToSL2Z(i32, 5, 15, 10) catch {
        err = true;
    };
    try expect(err);
}
