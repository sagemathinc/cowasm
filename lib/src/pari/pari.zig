pub const clib = @cImport(@cInclude("pari.h"));
const std = @import("std");
pub const General = error{OverflowError};

// The headers that define this are too hard for zig to parse due to macros.
extern fn pari_init_opts(parisize: clib.sizet, maxprime: clib.ulong, flags: c_int) void;

var didInit = false;
pub export fn init(parisize: clib.sizet, maxprime: clib.ulong) void {
    if (didInit) return;
    didInit = true;
    // We must use pari_init_opts rather than just pari_init, so we can set
    // different options (the last argument).
    const OPTIONS = 4; // this is INIT_DFTm = "initialize the defaults" -- header that has this is too hard to parse.
    pari_init_opts(if (parisize == 0) 64 * 10000000 else parisize, maxprime, OPTIONS);
}

pub fn exec(s: [*:0]const u8) ![*:0]u8 {
    const context = Context();
    defer context.deinit();
    var x: clib.GEN = clib.gp_read_str_multiline(s, null);
    return clib.GENtostr(x);
}

const ContextType = struct {
    av: clib.pari_sp,
    pub fn deinit(C: ContextType) void {
        clib.avma = C.av;
    }
};

pub fn Context() ContextType {
    init(0, 0);
    return ContextType{ .av = clib.avma };
}

// This is equivalent to "gcoeff(z, i, j) = x" in pari library code,
// but we have to rewrite because gcoeff is a macro.
pub fn setcoeff2(z: clib.GEN, i: usize, j: usize, x: clib.GEN) void {
    @ptrCast([*][*]clib.GEN, z)[j][i] = x;
}

pub fn getcoeff2(z: clib.GEN, i: usize, j: usize) clib.GEN {
    return @ptrCast([*][*]clib.GEN, z)[j][i];
}

pub fn setcoeff1(z: clib.GEN, i: usize, x: clib.GEN) void {
    @ptrCast([*]clib.GEN, z)[i] = x;
}

pub fn getcoeff1(z: clib.GEN, i: usize) clib.GEN {
    return @ptrCast([*]clib.GEN, z)[i];
}

const expect = std.testing.expect;

test "calling exec" {
    init(0, 0);
    const code = "nextprime(2021)";
    var r: [*:0]u8 = try exec(code);
    try expect(std.cstr.cmp(r, "2027") == 0);
    std.debug.print("exec('{s}') = {s}\n", .{ code, r });
    std.c.free(r);
}

const BENCH = false;
test "a little benchmark" {
    if (BENCH) {
        const time = std.time.milliTimestamp;
        const t = time();
        var i: usize = 0;
        while (i < 10) : (i += 1) {
            std.debug.print("pi(10^8) = {s}\n", .{try exec("primepi(10^8)")});
        }
        std.debug.print("{}ms\n", .{time() - t});
    }
}
