const factor = @import("factor.zig");
const std = @import("std");

extern fn sendPrimePower(p: i32, e: i32) void;
extern fn reportError() void;

// The static version below is fine up to 128 bits
// and probably much faster than dynamic allocation.

// var gpa = std.heap.GeneralPurposeAllocator(.{}){};
// pub export fn factorTrialDivision(N: i32) void {
//     const F = factor.factorTrialDivision(&gpa.allocator, N) catch {
//         reportError();
//         return;
//     };
//     defer F.deinit();
//     for (F.items) |primePower| {
//         sendPrimePower(primePower.p, primePower.e);
//     }
// }

pub export fn factorTrialDivision(N: i32) void {
    const F = factor.smallFactor(N);
    var i: u8 = 0;
    while (i < F.len) : (i += 1) {
        sendPrimePower(F.factors[i].p, F.factors[i].e);
    }
}
