const custom = @import("./custom-allocator.zig");
const integer = @import("./integer.zig");
const Integer = integer.Integer;
const std = @import("std");

pub export fn init() void {
    std.debug.print("init GMP integers", .{});
    custom.init();
}

pub export fn fromString(s: [*:0]const u8) void {
    std.debug.print("\nzig sees ='{s}'\n", .{s});
}

pub export fn isPseudoPrime(s: [*:0]const u8) i32 {
    // std.debug.print("\nisPseudoPrime ='{s}'\n", .{s});
    var n = Integer();
    n.initSetStr(s, 10) catch |err| {
        std.debug.print("isPseudoPrime -- {}\n", .{err});
        return -1;
    };
    defer n.clear();
    return n.primalityTest(5);
}

pub export fn isPseudoPrimeInt(s: i32) i32 {
    var n = Integer();
    n.initSet(s) catch |err| {
        std.debug.print("isPseudoPrimeInt -- {}\n", .{err});
        return -1;
    };
    defer n.clear();
    return n.primalityTest(5);
}

var integers: [10000]integer.IntegerType() = undefined;
var i: u32 = 0;
pub export fn createIntegerStr(s: [*:0]const u8) i32 {
    const j: u32 = i;
    integers[j] = Integer();
    integers[j].initSetStr(s, 10) catch |err| {
        std.debug.print("createIntegerStr -- {}\n", .{err});
        return -1;
    };
    i += 1;
    return @intCast(i32, j);
}

pub export fn createIntegerInt(n: i32) i32 {
    const j: u32 = i;
    integers[j] = Integer();
    integers[j].initSet(n) catch |err| {
        std.debug.print("createIntegerInt -- {}\n", .{err});
        return -1;
    };
    i += 1;
    return @intCast(i32, j);
}

pub export fn addIntegers(a: u32, b: u32) i32 {
    const j: u32 = i;
    integers[i] = integers[a].add(integers[b]);
    i += 1;
    return @intCast(i32, j);
}

pub export fn mulIntegers(a: u32, b: u32) i32 {
    const j: u32 = i;
    integers[i] = integers[a].mul(integers[b]);
    i += 1;
    return @intCast(i32, j);
}

pub export fn printInteger(a: u32) void {
    integers[a].print();
}

pub export fn freeInteger(a: u32) void {
    integers[a].clear();
}
