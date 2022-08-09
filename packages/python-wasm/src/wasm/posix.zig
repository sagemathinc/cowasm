const other = @import("./posix/other.zig");
const stdio = @import("./posix/stdio.zig");
const stdlib = @import("./posix/stdlib.zig");
const string = @import("./posix/string.zig");
const termios = @import("./posix/termios.zig");
const unistd = @import("./posix/unistd.zig");

pub fn keepalive() void {
    other.keepalive();
    stdio.keepalive();
    stdlib.keepalive();
    string.keepalive();
    termios.keepalive();
    unistd.keepalive();
}
