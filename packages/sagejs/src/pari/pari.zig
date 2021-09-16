const pari = @cImport(@cInclude("pari.h"));
const std = @import("std");

var didInit = false;
export fn init(parisize: pari.sizet, maxprime: pari.ulong) void {
    if (didInit) return;
    didInit = true;
    pari.pari_init(if (parisize == 0) 1000000 else parisize, if (maxprime == 0) 100000 else maxprime);
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

export fn exec(s: [*:0]const u8) void {
    var all_together: [100]u8 = undefined;
    // You can use slice syntax on an array to convert an array into a slice.
    const all_together_slice = all_together[0..];
    const t = std.fmt.bufPrint(all_together_slice, "{s}", .{s}) catch {
        std.debug.print("error in bufPrint\n",.{});
        return;
    };
    std.debug.print("s={*}  '{s}'\n", .{ s, s });
    std.debug.print("t={*}  '{s}'\n", .{ t, t });
    var av: pari.pari_sp = pari.avma;
    var x: pari.GEN = pari.gp_read_str_multiline(s, null);
    pari.output(x);
    pari.avma = av;
}

test "calling zig_add" {
    init(0, 0);
    try std.testing.expect(add(2, 3) == 5);
}

test "calling exec" {
    init(0, 0);
    exec("2+3");
}
