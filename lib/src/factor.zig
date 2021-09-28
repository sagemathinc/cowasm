// Factor small numbers using trial division
const std = @import("std");
const trialDivision = @import("trial-division.zig").trialDivision;

const pow = std.math.powi;

fn PrimePower(comptime T: type) type {
    return struct { p: T, e: T };
}

fn Factorization(comptime T: type) type {
    return std.ArrayList(PrimePower(T));
}

fn Expand(comptime T: type, F: Factorization(T)) !T {
    var N: T = 1;
    for (F.items) |primePower| {
        N = N * try pow(T, primePower.p, primePower.e);
    }
    return N;
}

pub fn factorTrialDivision(allocator: *std.mem.Allocator, N: anytype) !Factorization(@TypeOf(N)) {
    const T = @TypeOf(N);
    var v = Factorization(T).init(allocator);
    var M = N;
    while (M > 1) {
        const p = trialDivision(M);
        if (p == M) {
            // M is prime
            try v.append(.{ .p = p, .e = 1 });
            return v;
        } else {
            // p is a prime division of M.
            var e: T = 1;
            M = @divExact(M, p);
            while (@mod(M, p) == 0) : (M = @divExact(M, p)) {
                e += 1;
            }
            try v.append(.{ .p = p, .e = e });
        }
    }
    return v;
}

// Version of factoring for numbers up to 128 bits that doesn't use any
// dynamic allocation.
// The product 2 * 3 * ... * 103 of first 27 primes is bigger than 2^128,
// but the product 2 * 3 * ... * 101 is less than 2^128.  Thus the number
// of prime divisors of a number less than 2^128 is at most 26.
// Similarly for 64-bit: at most 15 primes.
// For 32-bit: at most 9 primes.
// For 16-bit: at most 6 primes.
// Also the exponent of any prime power divisor fits in a u8, obviously.
// This wastes some memory, but doesn't require any dynamic heap allocation.
// NOTE: our trial division implementation is way too slow to be useful
// for most numbers near 128 bits!  (TODO: Probably adding a quick primality 
// test would make this usable up to 128 bits though.)
fn SmallPrimePower(comptime T: type) type {
    return struct { p: T, e: u8 };
}

pub fn maxFactors(comptime T: type) comptime_int {
    const bits = @typeInfo(T).Int.bits;
    if (bits > 128) { // so it won't even compile
        unreachable;
    } else if (bits > 64) {
        return 26;
    } else if (bits > 32) {
        return 15;
    } else if (bits > 16) {
        return 9;
    } else {
        return 6;
    }
}

pub fn SmallFactorization(comptime T: type) type {
    const FACTORS = maxFactors(T);

    return struct {
        const Fact = @This();

        factors: [FACTORS]SmallPrimePower(T),
        len: u8,

        pub fn init(N: T) Fact {
            var factors: [FACTORS]SmallPrimePower(T) = undefined;
            var M = N;
            var len: u8 = 0;
            while (M > 1) {
                //std.debug.print("find factor of M={}\n", .{M});
                const p = trialDivision(M);
                //std.debug.print("got p={}\n", .{p});
                if (p == M) {
                    // M is prime
                    factors[len] = SmallPrimePower(T){ .p = p, .e = 1 };
                    len += 1;
                    break;
                } else {
                    // p is a proper prime division of M.
                    var e: u8 = 1;
                    M = @divExact(M, p);
                    while (@mod(M, p) == 0) : (M = @divExact(M, p)) {
                        e += 1;
                    }
                    factors[len] = SmallPrimePower(T){ .p = p, .e = e };
                    len += 1;
                }
            }
            //std.debug.print("factors = {}\n", .{FACTORS});
            return Fact{ .factors = factors, .len = len };
        }

        pub fn expand(self: Fact) !T {
            var N: T = 1;
            for (self.factors[0..self.len]) |factor| {
                // std.debug.print("p={},e={}\n", .{ factor.p, factor.e });
                var i: u8 = 0;
                while (i < factor.e) : (i += 1) {
                    N *= factor.p;
                }
            }
            return N;
        }
    };
}

pub fn smallFactor(N: anytype) SmallFactorization(@TypeOf(N)) {
    return SmallFactorization(@TypeOf(N)).init(N);
}

const expect = std.testing.expect;

test "small factorization of some numbers" {
    const N: i32 = 27 * 25 * 389 * 389;
    const F = smallFactor(N);
    try expect((try F.expand()) == N);
}

// slightly slow
test "small factorization of a greater than 64- bit number" {
    const N: u128 = 36893488147419103242; // = 2^65 + 10.
    const F = smallFactor(N);
    try expect((try F.expand()) == N);
    try expect(F.factors.len == 26);
}

test "small factorization of tiny number" {
    const N: i16 = 16385; // = 2^14 + 1
    const F = smallFactor(N);
    try expect((try F.expand()) == N);
}

test "factoring an explicit number" {
    const N: i32 = 27 * 25 * 389 * 389;
    const F = try factorTrialDivision(std.testing.allocator, N);
    defer F.deinit();
    //std.debug.print("\n{} = {s}\n", .{ N, F.items });
    try expect(F.items[0].p == 3);
    try expect((try Expand(i32, F)) == N);
}

test "factoring the numbers up to 2^14 using i16" {
    const T = i16;
    var N: T = 1;
    const B: T = try pow(T, @as(T, 2), @as(T, 14));
    while (N < B) : (N += 1) {
        const F = try factorTrialDivision(std.testing.allocator, N);
        defer F.deinit();
        try expect((try Expand(T, F)) == N);
    }
}

test "factoring all numbers in [95000,100000] using i32" {
    const T = i32;
    var N: T = 95000;
    while (N < 100000) : (N += 1) {
        const F = try factorTrialDivision(std.testing.allocator, N);
        defer F.deinit();
        try expect((try Expand(T, F)) == N);
    }
}

test "factor using 64-bit arith" {
    const N: i64 = 4611686018437290288;
    const F = try factorTrialDivision(std.testing.allocator, N);
    defer F.deinit();
    try expect((try Expand(@TypeOf(N), F)) == N);
}

test "factor using 128-bit arith" {
    // At this point most numbers would take WAY too long using trial division.
    const N: i128 = 21267647932649987338144809163979122944;
    const F = try factorTrialDivision(std.testing.allocator, N);
    defer F.deinit();
    try expect((try Expand(@TypeOf(N), F)) == N);
}
