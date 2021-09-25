// Compute continued fraction expansions.
// zig test contfrac.zig --main-pkg-path ..

const std = @import("std");
const errors = @import("../errors.zig");

// The continued fraction of a rational number is the list of partial
// quotients when running the Euclidean algorithm.
// We just return an array of n elements for n big enough
// given the type of the input.  This avoids
// costly dynamic memory allocation.
// INPUT: a positive nonzero rational number numer/denom
// OUTPUT: array of type T
fn ContFracArray(comptime T: type) type {
    if (T == i16 or T == u16) {
        return [16]T;
    } else if (T == i32 or T == u32) {
        return [32]T;
    } else if (T == i64 or T == u64) {
        return [64]T;
    } else if (T == i128 or T == u128) {
        return [128]T;
    } else {
        return [1000]T;
    }
}

fn ContinuedFraction(comptime T: type) type {
    return struct {
        array: ContFracArray(T),
        len: usize,
        pub fn print(self: ContinuedFraction(T)) void {
            var i: usize = 0;
            std.debug.print("\n[", .{});
            while (i < self.len) : (i += 1) {
                std.debug.print("{}, ", .{self.array[i]});
            }
            std.debug.print("]\n", .{});
        }
    };
}

pub fn continuedFraction(
    comptime T: type,
    numer: T,
    denom: T,
) !ContinuedFraction(T) {
    if (numer <= 0 or denom <= 0) {
        return errors.Math.ValueError;
    }
    var a = numer;
    var b = denom;
    var x = a;
    var y = b;
    var array: ContFracArray(T) = undefined;
    var i: usize = 0;
    while (y != 0) {
        const c = @mod(x, y);
        const q = @divFloor(x, y);
        array[i] = q;
        i += 1;
        x = y;
        y = c;
    }
    const len = i;
    while (i < array.len) : (i += 1) {
        array[i] = 0; // zero out the rest to reduce confusion.
    }
    return ContinuedFraction(T){ .array = array, .len = len };
}

fn Convergents(comptime T: type) type {
    const S = ContFracArray(T);
    return struct {
        p: S,
        q: S,
        len: usize,
        pub fn print(self: Convergents(T)) void {
            var i: usize = 0;
            std.debug.print("\n[", .{});
            while (i < self.len) : (i += 1) {
                std.debug.print("{}/{}, ", .{ self.p[i], self.q[i] });
            }
            std.debug.print("]\n", .{});
        }
    };
}

pub fn convergents(
    comptime T: type,
    numer: T,
    denom: T,
) !Convergents(T) {
    const cf = try continuedFraction(T, numer, denom);
    var p: ContFracArray(T) = undefined;
    var q: ContFracArray(T) = undefined;
    p[0] = cf.array[0] * 1 + 0;
    q[0] = cf.array[0] * 0 + 1;
    p[1] = cf.array[1] * p[0] + 1;
    q[1] = cf.array[1] * q[0] + 0;
    var i: usize = 2;
    while (i < cf.len) : (i += 1) {
        p[i] = cf.array[i] * p[i - 1] + p[i - 2];
        q[i] = cf.array[i] * q[i - 1] + q[i - 2];
    }
    return Convergents(T){ .p = p, .q = q, .len = cf.len };
}

const eql = std.mem.eql;
const expect = std.testing.expect;

test "blah" {
    const cf = try continuedFraction(u32, 123, 456);
    // cf.print();
    try expect(eql(u32, cf.array[0..7], &[7]u32{ 0, 3, 1, 2, 2, 2, 2 }));
}

// test "do a little benchmark" {
//     const cf = try continuedFraction(u128, 31208688988045323113527764971, 22846345976864506663892794568);
//     cf.print();
//     var i: usize = 0;
//     var j: u128 = 0;
//     while (i < 10000) : (i += 1) {
//         var v = try continuedFraction(u128, @intCast(u128, i) + 31208688988045323113527764971, 22846345976864506663892794568);
//         j += v.array[5];
//     }
//     std.debug.print("j = {}\n", .{j});
// }

test "rational number bigger than 1" {
    const cf = try continuedFraction(u32, 11, 7);
    // cf.print();
    try expect(eql(u32, cf.array[0..4], &[4]u32{ 1, 1, 1, 3 }));
    const v = try convergents(u32, 11, 7);
    // v.print();
    try expect(v.p[v.len - 1] == 11);
    try expect(v.q[v.len - 1] == 7);
}

test "compute convergents for all rationals with bounded numer and denom" {
    var n: u16 = 1;
    var d: u16 = 1;
    const gcd = @import("../arith.zig").gcd;
    while (n < 500) : (n += 1) {
        while (d < 500) : (d += 1) {
            if (gcd(n, d) == 1) {
                const v = try convergents(u16, n, d);
                try expect(v.p[v.len - 1] == n);
                try expect(v.q[v.len - 1] == d);
            }
        }
    }
}

// test "a convergents benchmark" {
//     const cf = try continuedFraction(u64, 76309315, 78425883);
//     cf.print();
//     const v = try convergents(u64, 76309315, 78425883);
//     v.print();
// }
