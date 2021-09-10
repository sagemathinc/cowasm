const arith = @import("./arith.zig");
const std = @import("std");

pub export fn gcd(a: i32, b: i32) i32 {
    return arith.gcd(a, b);
}

// returns -1 on error
pub export fn inverseMod(a: i32, N: i32) i32 {
    return arith.inverseMod(a, N) catch {
        return -1;
    };
}

extern fn returnXgcd(g: i32, s: i32, t: i32) void;

pub export fn xgcd(a: i32, b: i32) void {
    const z = arith.xgcd(a, b);
    returnXgcd(z.g, z.s, z.t);
}
