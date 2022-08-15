const c_define = @import("./posix/c-define.zig");
const netdb = @import("./posix/netdb.zig");
const other = @import("./posix/other.zig");
const stdio = @import("./posix/stdio.zig");
const stdlib = @import("./posix/stdlib.zig");
const string = @import("./posix/string.zig");
const termios = @import("./posix/termios.zig");
const unistd = @import("./posix/unistd.zig");

pub fn keepalive() void {
    c_define.keepalive();
    netdb.keepalive();
    other.keepalive();
    stdio.keepalive();
    stdlib.keepalive();
    string.keepalive();
    termios.keepalive();
    unistd.keepalive();
}
