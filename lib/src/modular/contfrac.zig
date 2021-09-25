// Compute continued fraction expansions.
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
    return struct { p: S, q: S };
}

fn convergents(
    comptime T: type,
    numer: T,
    denom: T,
) !ContFracArray(T) {
    if (numer <= 0 or denom <= 0) {
        return errors.Math.ValueError;
    }
}

test "blah" {
    const cf = try continuedFraction(u32, 123, 456);
    cf.print();
}

test "do a little benchmark" {
    const cf = try continuedFraction(u128, 31208688988045323113527764971, 22846345976864506663892794568);
    cf.print();
    var i: usize = 0;
    var j: u128 = 0;
    while (i < 1000000) : (i += 1) {
        var v = try continuedFraction(u128, @intCast(u128, i) + 31208688988045323113527764971, 22846345976864506663892794568);
        j += v.array[5];
    }
    std.debug.print("j = {}\n", .{j});
}
