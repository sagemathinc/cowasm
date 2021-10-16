// See sage/src/sage/arith/power.pyx

const std = @import("std");
const errors = @import("../errors.zig");

pub fn genericPower(a: anytype, n: usize) !@TypeOf(a) {
    if (n == 0) {
        return errors.Math.ValueError;
    }
    // Find least significant set bit as starting point
    var apow = a;
    var m = n;
    while ((m & 1) == 0) : (m >>= 1) {
        apow = apow.mul(apow);
    }

    // Now multiply together the correct factors a^(2^i)
    var res = apow;
    m >>= 1;
    while (m != 0) : (m >>= 1) {
        apow = apow.mul(apow);
        if (m & 1 != 0) {
            res = apow.mul(res);
        }
    }

    return res;
}

// This doesn't work properly because it doesn't
// call deinit along the way.
pub fn genericPowerAlloc(a: anytype, n: usize) !@TypeOf(a) {
    if (n == 0) {
        return errors.Math.ValueError;
    }
    // Find least significant set bit as starting point
    var apow = a;
    var m = n;
    while ((m & 1) == 0) : (m >>= 1) {
        apow = try apow.mul(apow);
    }

    // Now multiply together the correct factors a^(2^i)
    var res = apow;
    m >>= 1;
    while (m != 0) : (m >>= 1) {
        apow = try apow.mul(apow);
        if (m & 1 != 0) {
            res = try apow.mul(res);
        }
    }

    return res;
}

const expect = std.testing.expect;

const Number = struct {
    x: i32,
    pub fn mul(a: Number, b: Number) Number {
        return Number{ .x = a.x * b.x };
    }
};

test "compute some powers" {
    const b: i32 = 12;
    var a = Number{ .x = b };
    try expect((try genericPower(a, 1)).x == b);
    try expect((try genericPower(a, 2)).x == b * b);
    try expect((try genericPower(a, 7)).x == b * b * b * b * b * b * b);
}
