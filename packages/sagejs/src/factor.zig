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

const expect = std.testing.expect;

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
