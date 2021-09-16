const pari = @cImport(@cInclude("pari.h"));

var didInit = false;
export fn init() void {
    if (didInit) return;
    didInit = true;
    pari.pari_init(1000000, 100000);
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

export fn exec() void {
    const s = "ellan(ellinit([1,2,3,4,5]),100)";
    var av: pari.pari_sp = pari.avma;
    var x: pari.GEN = pari.gp_read_str_multiline(s, 0);
    pari.output(x);
    pari.avma = av;
}

const std = @import("std");
test "calling zig_add" {
    init();
    try std.testing.expect(add(2, 3) == 5);
}

test "calling exec" {
    init();
    exec();
}
