const pari = @cImport(@cInclude("pari/pari.h"));
const std = @import("std");
pub const General = error{OverflowError};

var didInit = false;
export fn init(parisize: pari.sizet, maxprime: pari.ulong) void {
    if (didInit) return;
    didInit = true;
    pari.pari_init(if (parisize == 0) 64 * 1000000 else parisize, if (maxprime == 0) 100000 else maxprime);
}

export fn add(a: c_long, b: c_long) c_long {
    var av: pari.pari_sp = pari.avma;
    var x: pari.GEN = pari.stoi(a);
    var y: pari.GEN = pari.stoi(b);
    var z: pari.GEN = pari.gadd(x, y);
    const r: c_long = pari.itos(z);
    pari.avma = av;
    return r;
}

const EXEC_BUFSIZE = 10000;
pub fn exec(s: [*:0]const u8) ![*:0]u8 {
    var av: pari.pari_sp = pari.avma;
    var x: pari.GEN = pari.gp_read_str_multiline(s, null);
    var r = pari.GENtostr(x);
    pari.avma = av; // TODO: don't need this memory anymore???  Or am I subtly breaking everything?!
    return r;
}

const expect = std.testing.expect;
test "calling zig_add" {
    init(0, 0);
    try expect(add(2, 3) == 5);
}

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
