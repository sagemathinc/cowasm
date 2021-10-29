const std = @import("std");

var p: std.rand.DefaultPrng = undefined;
var initialized: bool = false;
pub fn seededPrng() !std.rand.DefaultPrng {
    if (initialized) {
        return p;
    }
    // std.debug.print("initializing...\n", .{});
    p = std.rand.DefaultPrng.init(blk: {
        var seed: u64 = undefined;
        try std.os.getrandom(std.mem.asBytes(&seed));
        break :blk seed;
    });
    initialized = true;
    return p;
}

const expect = std.testing.expect;

test "can make a random number" {
    var prng = try seededPrng();
    var random = prng.random();
    var r = random.intRangeLessThan(i32, 0, 5);
    try expect(r >= 0);
    try expect(r < 5);
}

test "try twice" {
    var s1 = try seededPrng();
    var s2 = try seededPrng();
    try std.testing.expectEqual(s1.s, s2.s);
}
