const std = @import("std");
const trialDivision = @import("../trial-division.zig").trialDivision;

// Index of Gamma0(N) in SL2(Z), which is prod p^e + p^(e-1) for N = prod p^e.
// The code below computes the powers of p in the course of finding how much
// of p divides N, where p was found using trial division.  This avoid any
// dynamic memory allocation (making this 100x faster than the code in Sage).
fn index(comptime T: type, N: T) T {
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
        ind *= p_to_e + p_to_eminus1;
    }
    return ind;
}

export fn _index(N: i32) i32 {
    return index(i32, N);
}

const expect = std.testing.expect;
const time = std.time.milliTimestamp;

test "Compute index of some Gamma0(N)'s'" {
    try expect(index(i16, 1) == 1);
    try expect(index(i16, 11) == 12);
    try expect(index(i16, 389) == 390);
    try expect(index(i16, 100) == 180);
    try expect(bench_index(100000) == 7599142240);
}

const BENCH = true;

fn bench_index(B: i32) i64 {
    var N: i32 = 1;
    var s: i64 = 0;
    while (N <= B) : (N += 1) {
        s += index(i32, N);
    }
    return s;
}

test "Bench computing indexes of Gamma0(N)" {
    if (BENCH) {
        const t = time();
        const s = bench_index(1000000);
        std.debug.print("\ns = {}, tm = {}ms\n", .{ s, time() - t });
    }
}
