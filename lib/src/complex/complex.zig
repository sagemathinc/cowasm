// Zig has a nice implementation of complex numbers from scratch for different
// bit sizes in their standard library: lib/std/math/complex.zig
// Here we make them available to Javascript via WASM.
// The obvious *hope* is that this is more efficient than an implementation
// directly in Javascript -- for special functions that's clear, but
// for basic arithmetic it is not.

const std = @import("std");
const Complex = std.math.complex.Complex;

extern fn sendComplex(re: f64, im: f64) void;

export fn mul(re0: f64, im0: f64, re1: f64, im1: f64) void {
    const left = Complex(f64).init(re0, im0);
    const right = Complex(f64).init(re1, im1);
    const ans = left.mul(right);
    sendComplex(ans.re, ans.im);
}

export fn exp(re: f64, im: f64) void {
    const x = Complex(f64).init(re, im);
    const y = std.math.complex.exp(x);
    sendComplex(y.re, y.im);
}
