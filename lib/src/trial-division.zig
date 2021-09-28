const std = @import("std");

const expect = std.testing.expect;

// Return smallest prime divisor of N up to bound, beginning
// checking at start. Returns N if no such prime divisor is found.
// N should be a positive integer.

pub fn trialDivision(N: anytype) @TypeOf(N) {
    const T = @TypeOf(N);
    return _trialDivision(T, N, 0, 2);
}

pub fn trialDivisionUpTo(N: anytype, bound: anytype, start: anytype) @TypeOf(N) {
    const T = @TypeOf(N);
    return _trialDivision(T, N, bound, start);
}

// primality testing using trial division
pub fn isPrime(N: anytype) bool {
    return N > 1 and trialDivision(N) == N;
}

// prime counting using trial division (mainly for testing)
pub fn pi(x: anytype) @TypeOf(x) {
    const T = @TypeOf(x);
    var s: T = 0;
    var i: T = 1;
    while (i <= x) : (i += 1) {
        if (isPrime(i)) {
            s += 1;
        }
    }
    return s;
}

fn _trialDivision(comptime T: type, N: T, bound: T, start: T) T {
    if (N <= 1) {
        return N;
    }
    var m: T = 7;
    var i: u32 = 1;
    var dif = [_]T{ 6, 4, 2, 4, 2, 4, 6, 2 };

    if (start > 7) {
        // We need to find i.
        m = @mod(start, 30);
        if (m <= 1) {
            i = 0;
            m = start + (1 - m);
        } else if (m <= 7) {
            i = 1;
            m = start + (7 - m);
        } else if (m <= 11) {
            i = 2;
            m = start + (11 - m);
        } else if (m <= 13) {
            i = 3;
            m = start + (13 - m);
        } else if (m <= 17) {
            i = 4;
            m = start + (17 - m);
        } else if (m <= 19) {
            i = 5;
            m = start + (19 - m);
        } else if (m <= 23) {
            i = 6;
            m = start + (23 - m);
        } else if (m <= 29) {
            i = 7;
            m = start + (29 - m);
        }
    }

    // TODO: use a for loop?
    if (start <= 2 and @mod(N, 2) == 0) {
        return 2;
    }
    if (start <= 3 and @mod(N, 3) == 0) {
        return 3;
    }
    if (start <= 5 and @mod(N, 5) == 0) {
        return 5;
    }

    var limit = @floatToInt(T, @round(@sqrt(@intToFloat(f64, N))));
    if (bound != 0 and bound < limit) {
        limit = bound;
    }

    // Algorithm: only trial divide by numbers that
    // are congruent to 1,7,11,13,17,19,23,29 mod 30=2*3*5.
    while (m <= limit) : (i += 1) {
        if (@mod(N, m) == 0) {
            return m;
        }
        m += dif[@mod(i, 8)];
    }
    return N;
}

test "trial division with compile time constants" {
    try expect(trialDivision(12) == 2);
    try expect(trialDivision(13 * 17) == 13);
    try expect(trialDivision(389 * 5077 * 234457) == 389);
    try expect(trialDivision(97) == 97);
    try expect(trialDivisionUpTo(389 * 5077 * 234457, 300, 2) == 389 * 5077 * 234457);
}

test "trial division with u16" {
    const N: u16 = 3 * 5 * 17 * 257; // = 65535 = 2^16 - 1
    try expect(trialDivision(N) == 3);
    try expect(trialDivisionUpTo(N, 30, 10) == 17);
}

test "trial division with u64" {
    const n: u64 = std.math.pow(u64, 2, 63);
    try expect(trialDivision(n) == 2);

    // Have to use variable or it is compile time
    const n2: u64 = 9223372036854775829; // = 2^63 + 21 = 10103 * 912933983653843
    try expect(trialDivision(n2) == 10103);
}

// 128 bit works fine, even with WebAssembly.
test "trial division with u128" {
    const n: u128 = 170141183460469231731687303715884105728;
    try expect(trialDivision(n) == 2);
    const n2: u128 = 170141183460469231731687303715884105749; // = 2^127 + 21 = 71 * other stuff.
    try expect(trialDivision(n2) == 71);
}

// This crashes at compile time with:
//   LLVM ERROR: Unsupported library call operation!
// My guess is this is because of using @mod; maybe we
// have to write a better mod.
// test "trial division with u256" {
//     const n: u256 = 57896044618658097711785492504343953926634992332820282019728792003956564819967; // = 2^255 - 1 = 7 * other stuff.
//     try expect(trialDivision(n) == 7);
// }

fn sumTest(start: u32, end: u32) u64 {
    var N: u32 = start;
    var s: u64 = 0;
    while (N <= end) : (N += 1) {
        s += trialDivision(N);
    }
    return s;
}

test "sum of the divisor found using trial division" {
    // seems unlikely for this to be off if trial division is working!
    try expect(sumTest(1, 100) == 1258);
    try expect(sumTest(1, 100000) == 455298742);
    try expect(sumTest(1, 1000000) == 37568404990);
}

test "trial division primality testing" {
    try expect(isPrime(10) == false);
    try expect(isPrime(1) == false);
    try expect(isPrime(11) == true);
    try expect(isPrime(5077) == true);
}

test "computing pi(x) -- prime counting" {
    try expect(pi(@as(u32, 100)) == 25);
    try expect(pi(@as(u32, 1000)) == 168);
    try expect(pi(@as(u32, 10000)) == 1229);
    try expect(pi(@as(u32, 100000)) == 9592);
    try expect(pi(@as(u32, 1000000)) == 78498);
    // This takes too long.
    // try expect(pi(@as(u32, 10000000)) == 664579);
}

// pub fn main() void {
//     const t0 = std.time.milliTimestamp();
//     const x : i32 = 1000000;
//     const s = pi(x);
//     std.debug.warn("\n{}\nTIME = {}\n", .{s, std.time.milliTimestamp() - t0});
// }
