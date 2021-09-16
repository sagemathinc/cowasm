const pari = @cImport(@cInclude("pari-add.h"));

export fn zig_init() void {
    pari.sage_pari_init();
}
export fn zig_add(a: c_long, b: c_long) c_long {
    return pari.sage_pari_add(a, b);
}

export fn zig_exec() void {
    //var cmd = "ellinit([1,2,3,4,5])";
    pari.sage_pari_exec();
}

const std = @import("std");
test "calling zig_add" {
    zig_init();
    try std.testing.expect(zig_add(2, 3) == 5);
}
