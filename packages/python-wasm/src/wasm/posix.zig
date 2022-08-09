const stdio = @import("./posix/stdio.zig");
const string = @import("./posix/string.zig");
const unistd = @import("./posix/unistd.zig");

pub fn keepalive() void {
    stdio.keepalive();
    string.keepalive();
    unistd.keepalive();
}
