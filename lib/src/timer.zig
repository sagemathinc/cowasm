const std = @import("std");
// std.time.milliTimestamp;

const Timer = struct {
    t: i64,
    verbose: bool,
    pub fn print(self: *Timer, s: []const u8) void {
        if (!self.verbose) return;
        const now = std.time.milliTimestamp();
        std.debug.print("{}ms:\t {s}\n", .{ now - self.t, s });
        self.t = now;
    }
};

pub fn timer(verbose: bool) Timer {
    return Timer{ .t = std.time.milliTimestamp(), .verbose = verbose };
}
