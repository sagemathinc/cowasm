const custom = @import("../custom-allocator.zig");
const rational = @import("./rational.zig");
const Rational = rational.Rational;
const interface = @import("../interface.zig");
const std = @import("std");
const RuntimeError = @import("../errors.zig").General.RuntimeError;

pub fn init() void {} // trick so whole module doesn't get optimized away

// The collection of proxied rationals
var rationals = interface.ProxyObjects(Rational).init();

fn get(n: i32) !Rational {
    return rationals.get(n) orelse {
        interface.throw("Rational: failed to get rational");
        return RuntimeError;
    };
}

pub fn put(x: anyerror!Rational) !i32 {
    var y = x catch {
        interface.throw("Rational: memory error");
        return 0;
    };
    return rationals.put(y) catch {
        interface.throw("Rational: failed to store rational");
        return 0;
    };
}

pub export fn Rational_createStr(s: [*:0]const u8, base: i32) i32 {
    var x = Rational.initSetStr(s, base) catch |err| {
        std.debug.print("createRationalStr -- {}\n", .{err});
        interface.throw("error creating rational from string");
        return 0;
    };
    return put(x) catch return 0;
}

pub export fn Rational_createInt(n: i32) i32 {
    var x = Rational.initSet(n) catch |err| {
        std.debug.print("createRationalInt -- {}\n", .{err});
        interface.throw("error creating rational from int");
        return -1;
    };
    return put(x) catch return 0;
}

pub export fn Rational_eql(a: i32, b: i32) bool {
    const A = get(a) catch return false;
    const B = get(b) catch return false;
    return A.eql(B);
}

pub export fn Rational_cmp(a: i32, b: i32) i32 {
    const A = get(a) catch return -1;
    const B = get(b) catch return -1;
    return A.cmp(B);
}

pub export fn Rational_add(a: i32, b: i32) i32 {
    const A = get(a) catch return 0;
    const B = get(b) catch return 0;
    return put(A.add(B)) catch return 0;
}

pub export fn Rational_sub(a: i32, b: i32) i32 {
    const A = get(a) catch return 0;
    const B = get(b) catch return 0;
    return put(A.sub(B)) catch return 0;
}

pub export fn Rational_mul(a: i32, b: i32) i32 {
    const A = get(a) catch return 0;
    const B = get(b) catch return 0;
    return put(A.mul(B)) catch return 0;
}

pub export fn Rational_div(a: i32, b: i32) i32 {
    const A = get(a) catch return 0;
    const B = get(b) catch return 0;
    return put(A.div(B)) catch return 0;
}

pub export fn Rational_pow(a: i32, exponent: i32) i32 {
    var A = get(a) catch return 0;
    return put(A.pow(exponent)) catch return 0;
}

pub export fn Rational_inverse(a: i32) i32 {
    var A = get(a) catch return 0;
    return put(A.inverse()) catch return 0;
}

pub export fn Rational_print(a: i32) void {
    const A = get(a) catch return;
    A.print();
}

extern fn wasmSendString(ptr: [*]const u8, len: usize) void;

pub export fn Rational_toString(a: i32, base: i32) void {
    const n = get(a) catch return;
    var str = n.toString(base) catch |err| {
        std.debug.print("toString -- {}\n", .{err});
        interface.throw("error converting to string");
        return;
    };
    defer n.freeString(str);
    wasmSendString(str.ptr, str.len);
}

pub export fn Rational_free(a: i32) void {
    rationals.free(a);
}

pub export fn Rational_stringify(handle: i32) void {
    rationals.stringify(handle);
}

pub export fn Rational_format(handle: i32) void {
    rationals.format(handle);
}
