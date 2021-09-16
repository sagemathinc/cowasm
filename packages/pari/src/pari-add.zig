const pari = @cImport(@cInclude("pari-add.h"));


export fn pari_add_from_zig(a: c_long, b: c_long) c_long {
    return pari.pari_add(a, b);
}

const std = @import("std");
test "calling pari_add_from_zig" {
    try std.testing.expect(pari_add_from_zig(2, 3) == 5);
}
