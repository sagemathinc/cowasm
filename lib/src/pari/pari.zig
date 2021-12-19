const pari = @cImport(@cInclude("pari/pari.h"));
const std = @import("std");
pub const General = error{OverflowError};

// The headers that define this are too hard for zig to parse due to macros.
extern fn pari_init_opts(parisize: pari.sizet, maxprime: pari.ulong, flags: c_int) void;

var didInit = false;
export fn init(parisize: pari.sizet, maxprime: pari.ulong) void {
    if (didInit) return;
    didInit = true;
    // We must use pari_init_opts rather than just pari_init, so we can set
    // different options (the last argument).
    const OPTIONS = 4; // this is INIT_DFTm = "initialize the defaults" -- header that has this is too hard to parse.
    pari_init_opts(if (parisize == 0) 64 * 1000000 else parisize, maxprime, OPTIONS);
}

pub fn exec(s: [*:0]const u8) ![*:0]u8 {
    var av: pari.pari_sp = pari.avma;
    var x: pari.GEN = pari.gp_read_str_multiline(s, null);
    var r = pari.GENtostr(x);
    pari.avma = av; // TODO: don't need this memory anymore???  Or am I subtly breaking everything?!
    return r;
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
