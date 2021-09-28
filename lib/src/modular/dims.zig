// See src/sage/modular/arithgroup/congroup_gamma0.py of sage.

const std = @import("std");
const trialDivision = @import("../trial-division.zig").trialDivision;
const gcd = @import("../arith.zig").gcd;

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

export fn _index(N: i32) i32 {
    return index(i32, N);
}

fn eulerPhi(comptime T: type, N: T) T {
    return signed_prod(T, N, -1);
}

export fn _eulerPhi(N: i32) i32 {
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

//fn divisors(comptime T: type, N: T) void {
    // TODO learn how to make iterators.  Oh, obvious, use a
    // struct and keep state that way.
//}

// sum([arith.euler_phi(arith.gcd(d,N/d)) for d in N.divisors()])
fn ncusps(comptime T: type, N: T) T {
    // Trial division lets us easily run through the proper divisors d of N.
    // THIS IS VERY WRONG, OF COURSE.
    var d: T = N;
    var N_over_d: T = 1;
    var s: T = 1;
    while (d > 1) {
        const p = trialDivision(d);
        d = @divExact(d, p);
        N_over_d *= p;
        s += eulerPhi(T, gcd(d, N_over_d));
        std.debug.print("\nd={}, N/d={}, sum phi(gcd(d,N/d))={}\n", .{ d, N_over_d, s });
    }
    return s;
}

fn dimensionCuspForms(comptime T: type, N: T) T {
    // dim = 1 + index / 12  - nu2/4 - nu3/3 - ncusps/2
    // we multiply by 12 to avoid arithmetic with rational numbers.
    const d = 12 + index(T, N) - nu2(T, N) * 3 - nu3(T, N) * 4 - ncusps(T, N) * 6;
    std.debug.print("\nd12 = {}\n", .{d});
    return @divExact(d, 12);
}

// TESTING

const expect = std.testing.expect;
const time = std.time.milliTimestamp;

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
    //try expect(ncusps(i16, 15) == 4);
    try expect(ncusps(i16, 97) == 2);
   // try expect(ncusps(i16, 100) == 18);
}

test "Some dimensions" {
    //try expect(dimensionCuspForms(i16, 11) == 1);
    //try expect(dimensionCuspForms(i16, 12) == 0);
    //try expect(dimensionCuspForms(i16, 100) == 7);
}
