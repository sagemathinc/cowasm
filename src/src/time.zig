const std = @import("std");

pub fn time() u64 {
    var timer = std.time.Timer.start() catch {
        return 0;
    };
    return timer.lap();
}
