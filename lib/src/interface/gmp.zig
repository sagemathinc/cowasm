const custom = @import("../custom-allocator.zig");
const rational = @import("../rational/interface.zig");
const integer = @import("../integer/interface.zig");

// Change to using Zig instead of malloc for GMP memory.
pub export fn initCustomAllocator() void {
    //std.debug.print("GMP: initCustomAllocator\n", .{});
    custom.init();
}

// this is a no-op to prevent rational and integer from getting optimized away
pub export fn init() void {
    integer.init();
    rational.init();
}
