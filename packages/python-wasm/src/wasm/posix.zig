const unistd = @import("./posix/unistd.zig");

pub fn exported() void {
    unistd.exported();
}
