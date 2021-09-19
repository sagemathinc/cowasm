const std = @import("std");
const python = @import("./python.zig");

export fn myinit() void {
    python.init();
}