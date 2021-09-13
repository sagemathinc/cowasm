const factor = @import("factor.zig");
const std = @import("std");

extern fn sendPrimePower(p: i32, e: i32) void;
extern fn reportError() void;

var gpa = std.heap.GeneralPurposeAllocator(.{}){};

pub export fn factorTrialDivision(N: i32) void {
    const F = factor.factorTrialDivision(&gpa.allocator, N) catch {
        reportError();
        return;
    };
    defer F.deinit();
    for (F.items) |primePower| {
        sendPrimePower(primePower.p, primePower.e);
    }
}
