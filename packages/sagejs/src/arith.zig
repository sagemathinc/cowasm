const errors = @import("errors.zig");

pub fn mod(a: anytype, N: anytype) @TypeOf(a) {
    if (N == 0) return 0;
    var b = @mod(a, abs(N));
    if (b < 0) {
        b += N;
    }
    return b;
}

pub fn abs(a: anytype) @TypeOf(a) {
    return if (a < 0) -a else a;
}

pub fn sign(a: anytype) @TypeOf(a) {
    return if (a < 0) -1 else 1;
}

pub fn gcd(a: anytype, b: anytype) @TypeOf(a) {
    if (a == 0) {
        return abs(b);
    }
    if (b == 0) {
        return abs(a);
    }
    var x = a;
    var y = b;
    if (x < 0) {
        x = -x;
    }
    if (y < 0) {
        y = -y;
    }
    while (y != 0) {
        const c = @mod(x, y);
        x = y;
        y = c;
    }
    return x;
}

pub fn xgcd(a0: anytype, b0: anytype) struct { g: @TypeOf(a0), s: @TypeOf(a0), t: @TypeOf(a0) } {
    if (a0 == 0) {
        return .{ .g = abs(b0), .s = 0, .t = sign(b0) };
    }
    if (b0 == 0) {
        return .{ .g = abs(a0), .s = sign(a0), .t = 0 };
    }
    const T = @TypeOf(a0);
    var psign: T = 1;
    var qsign: T = 1;
    var a: T = a0;
    var b: T = b0;
    if (a < 0) {
        a = -a;
        psign = -1;
    }
    if (b < 0) {
        b = -b;
        qsign = -1;
    }
    var p: T = 1;
    var q: T = 0;
    var r: T = 0;
    var s: T = 1;
    while (b != 0) {
        const c = mod(a, b);
        const quot = @divFloor(a, b);
        a = b;
        b = c;
        const new_r = p - quot * r;
        const new_s = q - quot * s;
        p = r;
        q = s;
        r = new_r;
        s = new_s;
    }

    return .{ .g = a, .s = p * psign, .t = q * qsign };
}

// compute multiplicative inverse of a modulo N.
pub fn inverseMod(a: anytype, N: anytype) !@TypeOf(a) {
    if (a == 1 or N <= 1) {
        // common special cases
        return mod(a, N);
    }
    const xgcd_aN = xgcd(a, N);
    if (xgcd_aN.g != 1) {
        return errors.MathError.ZeroDivisionError;
    }
    return mod(xgcd_aN.s, N);
}
