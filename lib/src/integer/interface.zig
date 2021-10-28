const integer = @import("./integer.zig");
const Integer = integer.Integer;
const interface = @import("../interface.zig");
const std = @import("std");
const RuntimeError = @import("../errors.zig").General.RuntimeError;
const rational_interface = @import("../rational/interface.zig");

pub fn init() void {} // trick so whole module doesn't get optimized away

var gpa = std.heap.GeneralPurposeAllocator(.{}){};

// The collection of proxied integers
pub var integers = interface.ProxyObjects(Integer).init(&gpa.allocator);

fn get(n: i32) !Integer {
    return integers.get(n) orelse {
        interface.throw("Integer: failed to get integer");
        return RuntimeError;
    };
}

fn put(x: anyerror!Integer) !i32 {
    var y = x catch {
        interface.throw("Integer: memory error");
        return 0;
    };
    return integers.put(y) catch {
        interface.throw("Integer: failed to store integer");
        return 0;
    };
}

pub export fn Integer_createStr(s: [*:0]const u8, base: i32) i32 {
    var x = Integer.initSetStr(s, base) catch |err| {
        std.debug.print("createIntegerStr -- {}\n", .{err});
        interface.throw("error creating integer from string");
        return 0;
    };
    return put(x) catch return 0;
}

pub export fn Integer_createInt(n: i32) i32 {
    var x = Integer.initSet(n) catch |err| {
        std.debug.print("createIntegerInt -- {}\n", .{err});
        interface.throw("error creating integer from int");
        return -1;
    };
    return put(x) catch return 0;
}

pub export fn Integer_eql(a: i32, b: i32) bool {
    const A = get(a) catch return false;
    const B = get(b) catch return false;
    return A.eql(B);
}

pub export fn Integer_cmp(a: i32, b: i32) i32 {
    const A = get(a) catch return -1;
    const B = get(b) catch return -1;
    return A.cmp(B);
}

pub export fn Integer_add(a: i32, b: i32) i32 {
    const A = get(a) catch return 0;
    const B = get(b) catch return 0;
    return put(A.add(B)) catch return 0;
}

pub export fn Integer_sub(a: i32, b: i32) i32 {
    const A = get(a) catch return 0;
    const B = get(b) catch return 0;
    return put(A.sub(B)) catch return 0;
}

pub export fn Integer_mul(a: i32, b: i32) i32 {
    const A = get(a) catch return 0;
    const B = get(b) catch return 0;
    return put(A.mul(B)) catch return 0;
}

// always returns handle of a RATIONAL number!
pub export fn Integer_div(a: i32, b: i32) i32 {
    const A = get(a) catch return 0;
    const B = get(b) catch return 0;
    return rational_interface.put(A.div(B)) catch return 0;
}

pub export fn Integer_pow(a: i32, b: u32) i32 {
    const A = get(a) catch return 0;
    return put(A.pow(b)) catch return 0;
}

pub export fn Integer_neg(a: i32) i32 {
    const A = get(a) catch return 0;
    return put(A.neg()) catch return 0;
}

pub export fn Integer_nextPrime(a: i32) i32 {
    const A = get(a) catch return 0;
    return put(A.nextPrime()) catch return 0;
}

pub export fn Integer_gcd(a: i32, b: i32) i32 {
    const A = get(a) catch return 0;
    const B = get(b) catch return 0;
    return put(A.gcd(B)) catch return 0;
}

pub export fn Integer_print(a: i32) void {
    const A = get(a) catch return;
    A.print();
}

extern fn wasmSendString(ptr: [*]const u8, len: usize) void;

pub export fn Integer_toString(a: i32, base: i32) void {
    const n = get(a) catch return;
    var str = n.toString(base) catch |err| {
        std.debug.print("toString -- {}\n", .{err});
        interface.throw("error converting to string");
        return;
    };
    defer n.freeString(str);
    wasmSendString(str.ptr, str.len);
}

pub export fn Integer_stringify(handle: i32) void {
    integers.stringify(handle);
}

pub export fn Integer_format(handle: i32) void {
    integers.format(handle);
}

pub export fn Integer_sizeInBaseBound(a: i32, base: i32) i32 {
    const n = get(a) catch return 0;
    return @intCast(i32, n.sizeInBaseBound(base));
}

pub export fn Integer_free(a: i32) void {
    integers.free(a);
}

pub export fn Integer_wrappedIsPseudoPrime(a: i32) i32 {
    const n = get(a) catch return -1;
    return n.primalityTest(5);
}

pub export fn Integer_isPseudoPrime(s: [*:0]const u8) i32 {
    // std.debug.print("\nisPseudoPrime ='{s}'\n", .{s});
    var n = Integer.initSetStr(s, 10) catch |err| {
        std.debug.print("isPseudoPrime -- {}\n", .{err});
        return -1;
    };
    defer n.deinit();
    return n.primalityTest(5);
}

pub export fn Integer_isPseudoPrimeInt(s: i32) i32 {
    var n = Integer.initSet(s) catch |err| {
        std.debug.print("isPseudoPrimeInt -- {}\n", .{err});
        return -1;
    };
    defer n.deinit();
    return n.primalityTest(5);
}
