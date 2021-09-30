// See src/sage/modular/arithgroup/congroup_gamma0.py of sage.

const std = @import("std");
const trialDivision = @import("../trial-division.zig").trialDivision;
const gcd = @import("../arith.zig").gcd;
const errors = @import("../errors.zig");
const factor = @import("../factor.zig");
const expect = std.testing.expect;
const time = std.time.milliTimestamp;

// Index of Gamma0(N) in SL2(Z), which is prod p^e + p^(e-1) for N = prod p^e.
// The code below computes the powers of p in the course of finding how much
// of p divides N, where p was found using trial division.  This avoid any
// dynamic memory allocation (making this 100x faster than the code in Sage).
// Here we explicit input sign so can also compute euler Phi, which is
// given by the same algorithm except p^e - p^(e-1).
fn signed_prod(comptime T: type, N: T, sign: T) T {
    var ind: T = 1;
    var M = N;
    while (M > 1) {
        const p = trialDivision(M);
        M = @divExact(M, p);
        var p_to_e: T = p;
        var p_to_eminus1: T = 1;
        while (@mod(M, p) == 0) : (M = @divExact(M, p)) {
            p_to_e *= p;
            p_to_eminus1 *= p;
        }
        ind *= p_to_e + sign * p_to_eminus1;
    }
    return ind;
}

fn index(comptime T: type, N: T) T {
    return signed_prod(T, N, 1);
}

export fn wasm_index(N: i32) i32 {
    return index(i32, N);
}

fn eulerPhi(comptime T: type, N: T) T {
    return signed_prod(T, N, -1);
}

export fn wasm_eulerPhi(N: i32) i32 {
    return eulerPhi(i32, N);
}

fn nu2(comptime T: type, N: T) T {
    if (@mod(N, 4) == 0) {
        return 0;
    }
    // nu2 = prod([ 1 + kronecker_symbol(-4, p) for p, _ in n.factor()])
    // We have kronecker(-4,p)=0 when p=2; =-1 when p=3(mod 4), and =1 when p=1(mod 4)
    var prod: T = 1;
    var M = N;
    while (M > 1) {
        const p = trialDivision(M);
        while (true) : (M = @divExact(M, p)) {
            if (@mod(M, p) != 0) break;
        }
        if (p == 2) continue;
        if (@mod(p, 4) == 3) return @as(T, 0);
        prod *= 2;
    }
    return prod;
}

fn nu3(comptime T: type, N: T) T {
    if (@mod(N, 9) == 0) {
        return 0;
    }
    var prod: T = 1;
    var M = N;
    while (M > 1) {
        const p = trialDivision(M);
        while (true) : (M = @divExact(M, p)) {
            if (@mod(M, p) != 0) break;
        }
        if (p == 3) continue;
        if (@mod(p, 3) == 2) return @as(T, 0);
        prod *= 2;
    }
    return prod;
}

fn Divisors(comptime T: type) type {
    const FACTORS: comptime_int = factor.maxFactors(T);

    return struct {
        const Divs = @This();

        factors: factor.SmallFactorization(T),
        odometer: [FACTORS]u8, // the odometer that we step through
        M: T, // current value of the iterator (what it will return when next is called).
        N: T,
        i: u8, // current pointer to the odometer

        pub fn init(N: T) Divs {
            return Divs{ .factors = factor.smallFactor(N), .odometer = [_]u8{0} ** FACTORS, .M = 1, .N = N, .i = 0 };
        }

        pub fn reset(self: *Divs) void {
            self.current = [_]u8{0} ** FACTORS;
            self.i = 0;
            self.M = 1;
        }

        pub fn next(self: *Divs) !T {
            if (self.M == 0) {
                // done!
                return errors.General.StopIteration;
            }
            const result = self.M; // What we will return.
            self.advance();
            return result;
        }

        fn advance(self: *Divs) void {
            if (self.N == 1) { // special case.
                self.M = 0;
                return;
            }

            // increment odometer one step forward
            self.odometer[self.i] += 1;

            while (self.i < self.factors.len) {
                if (self.odometer[self.i] <= self.factors.factors[self.i].e) {
                    // Last increment didn't overflow current position.
                    self.M *= self.factors.factors[self.i].p;
                    // Next iteration will be position 0.
                    self.i = 0;
                    return;
                }
                if (self.i == self.factors.len - 1 and self.odometer[self.i] >= self.factors.factors[self.i].e) {
                    // We're done!
                    self.M = 0;
                    return;
                }
                // Last increment did overflow current digit, so account for that.
                self.odometer[self.i] = 0;
                var j: u8 = 0;
                while (j < self.factors.factors[self.i].e) : (j += 1) {
                    self.M = @divExact(self.M, self.factors.factors[self.i].p);
                }
                self.i += 1;
                self.odometer[self.i] += 1;
            }
        }
    };
}

pub fn divisors(N: anytype) Divisors(@TypeOf(N)) {
    return Divisors(@TypeOf(N)).init(N);
}

test "compute divisors of 3" {
    var D = divisors(@as(i16, 3));
    try expect((try D.next()) == 1);
    try expect((try D.next()) == 3);
}

test "compute divisors of 9" {
    var D = divisors(@as(i16, 9));
    try expect((try D.next()) == 1);
    try expect((try D.next()) == 3);
    try expect((try D.next()) == 9);
    var err = false;
    _ = D.next() catch {
        err = true;
        return;
    };
    try expect(err == true);
}

test "compute divisors of 12" {
    var D = divisors(@as(i8, 12));
    for ([_]u8{ 1, 2, 4, 3, 6, 12 }) |d| {
        try expect((try D.next()) == d);
    }
}

test "compute divisors of 100" {
    var D = divisors(@as(i16, 100));
    for ([_]u8{ 1, 2, 4, 5, 10, 20, 25, 50, 100 }) |d| {
        try expect((try D.next()) == d);
    }
}

// sum([arith.euler_phi(arith.gcd(d,N/d)) for d in N.divisors()])
fn ncusps(comptime T: type, N: T) T {
    var D = divisors(N);
    var s: T = 0;
    while (true) {
        const d = D.next() catch {
            return s;
        };
        s += eulerPhi(T, gcd(d, @divExact(N, d)));
    }
}

pub fn dimensionCuspForms(comptime T: type, N: T) T {
    // dim = 1 + index/12  - nu2/4 - nu3/3 - ncusps/2
    // we multiply by 12 to avoid arithmetic with rational numbers.
    const d = 12 + index(T, N) - nu2(T, N) * 3 - nu3(T, N) * 4 - ncusps(T, N) * 6;
    //std.debug.print("\nd12 = {}\n", .{d});
    return @divExact(d, 12);
}

export fn wasm_dimensionCuspForms(N: i32) i32 {
    return dimensionCuspForms(i32, N);
}

pub fn dimensionModularForms(comptime T: type, N: T) T {
    // We compute directly instead of adding dim S and dim E like in Sage,
    // to avoid computing ncpus twice -- it's expensive, after all!
    // dim = dim S + dim E = 1 + index/12  - nu2/4 - nu3/3 - ncusps/2 + ncusps - 1
    //     =index/12  - nu2/4 - nu3/3 + ncusps/2
    const d = index(T, N) - nu2(T, N) * 3 - nu3(T, N) * 4 + ncusps(T, N) * 6;
    return @divExact(d, 12);
}

test "Compute dimension of space of modular forms" {
    try expect(dimensionModularForms(i32, 389) == 33);
    try expect(dimensionModularForms(i32, 100) == 24);
    var N: i32 = 1;
    var s: i32 = 0;
    var t = time();
    while (N <= 10000) : (N += 1) {
        s += dimensionModularForms(i32, N);
    }
    std.debug.print("\n sum mod form dim = {}, {}ms\n", .{ s, time() - t });
    try expect(s == 6402996);
}

export fn wasm_dimensionModularForms(N: i32) i32 {
    return dimensionModularForms(i32, N);
}

pub fn dimensionEisensteinSeries(comptime T: type, N: T) T {
    return ncusps(T, N) - 1;
}

test "Compute dimension of space of Eisenstein series" {
    try expect(dimensionEisensteinSeries(i32, 389) == 1);
    try expect(dimensionEisensteinSeries(i32, 100) == 17);
    var N: i32 = 1;
    var s: i32 = 0;
    var t = time();
    while (N <= 10000) : (N += 1) {
        s += dimensionEisensteinSeries(i32, N);
    }
    std.debug.print("\n sum eis dim = {}, {}ms\n", .{ s, time() - t });
    try expect(s == 134556);
}

export fn wasm_dimensionEisensteinSeries(N: i32) i32 {
    return dimensionEisensteinSeries(i32, N);
}

test "Compute index of some Gamma0(N)'s'" {
    try expect(index(i16, 1) == 1);
    try expect(index(i16, 11) == 12);
    try expect(index(i16, 389) == 390);
    try expect(index(i16, 100) == 180);
    try expect(bench_index(100000) == 7599142240); // I checked this against sage.
}

const BENCH = false;
fn bench_index(B: i32) i64 {
    var N: i32 = 1;
    var s: i64 = 0;
    while (N <= B) : (N += 1) {
        s += index(i32, N);
    }
    return s;
}
test "Bench computing indexes to a million" {
    if (BENCH) {
        const t = time();
        const s = bench_index(1000000);
        std.debug.print("\nIndex: s = {}, tm = {}ms\n", .{ s, time() - t });
    }
}

test "Compute eulerPhi" {
    try expect(eulerPhi(i16, 1) == 1);
    try expect(eulerPhi(i16, 11) == 10);
    try expect(eulerPhi(i16, 389) == 388);
    try expect(eulerPhi(i16, 100) == 40);
}

fn bench_eulerPhi(B: i32) i64 {
    var N: i32 = 1;
    var s: i64 = 0;
    while (N <= B) : (N += 1) {
        s += eulerPhi(i32, N);
    }
    return s;
}
test "Bench computing eulerPhi to a million" {
    if (BENCH) {
        const t = time();
        const s = bench_eulerPhi(1000000);
        std.debug.print("\neulerPhi: s = {}, tm = {}ms\n", .{ s, time() - t });
    }
}

test "Compute nu2" {
    try expect(nu2(i16, 2) == 1);
    try expect(nu2(i16, 4) == 0);
    try expect(nu2(i16, 11) == 0);
    try expect(nu2(i16, 3 * 7 * 997) == 0);
    try expect(nu2(i32, 25 * 29 * 29 * 29) == 4);
}

test "Compute nu3" {
    try expect(nu3(i16, 3) == 1);
    try expect(nu3(i16, 9) == 0);
    try expect(nu3(i16, 5) == 0);
    try expect(nu3(i32, 7 * 13) == 4);
}

test "Some number of cusps" {
    try expect(ncusps(i16, 11) == 2);
    try expect(ncusps(i16, 15) == 4);
    try expect(ncusps(i16, 97) == 2);
    try expect(ncusps(i16, 100) == 18);
}

test "Some dimensions" {
    try expect(dimensionCuspForms(i16, 11) == 1);
    try expect(dimensionCuspForms(i16, 12) == 0);
    try expect(dimensionCuspForms(i16, 100) == 7);
}

fn sumDimBench(comptime T: type, B: T) T {
    var s: T = 0;
    var N: T = 1;
    while (N <= B) : (N += 1) {
        s += dimensionCuspForms(T, N);
    }
    return s;
}

test "Sum up the dimension to various bounds as a consistency check (with sage)" {
    try expect(sumDimBench(i16, 11) == 1);
    try expect(sumDimBench(i16, 100) == 429);
    try expect(sumDimBench(i32, 1000) == 59365);
    try expect(sumDimBench(i32, 10000) == 6268440);
}

test "Benchmark computing the sum of the dimensions of cusp forms" {
    // %time sum(dimension_cusp_forms(N) for N in [1..100000])
    // 10000:    sage:   603ms;  native-zig:   21ms (factor of 29x);   nodejs:   11ms
    // 100000:   sage:  6570ms;  native-zig:  108ms (factor of 61x);   nodejs:  125ms
    // 1000000:  sage: 72000ms;  native-zig: 1612ms (factor of 45x);   nodejs: 1818ms
    // and results matched
    if (false) {
        const t = time();
        const s = sumDimBench(i64, 1000000);
        std.debug.print("\nSum: s = {}, tm = {}ms\n", .{ s, time() - t });
    }
}
