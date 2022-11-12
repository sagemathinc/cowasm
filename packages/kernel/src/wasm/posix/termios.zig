pub fn keepalive() void {}
const termios = @cImport(@cInclude("termios.h"));
const std = @import("std");
const expect = std.testing.expect;
const errno = @cImport(@cInclude("errno.h"));

pub const constants = .{
    .c_import = termios,
    .names = [_][:0]const u8{
        // c_iflag's:
        "IGNBRK",  "BRKINT", "IGNPAR",
        "PARMRK",  "INPCK",  "ISTRIP",
        "INLCR",   "IGNCR",  "ICRNL",
        "IXON",    "IXANY",  "IXOFF",
        "IMAXBEL", "IUTF8",
        // c_oflag's:
         "OPOST",
        "ONLCR",   "OCRNL",  "ONOCR",
        "ONLRET",  "OFILL",  "OFDEL",
        // c_cflag's:
        "CSIZE",   "CS5",    "CS6",
        "CS7",     "CS8",    "CSTOPB",
        "CREAD",   "PARENB", "PARODD",
        "HUPCL",   "CLOCAL",
        // c_lflag's
        "ICANON",
        "ISIG",    "ECHO",   "ECHOE",
        "ECHOK",   "ECHONL", "NOFLSH",
        "TOSTOP",  "IEXTEN",
    },
};


// ported from zig/lib/libc/wasi/libc-top-half/musl/src/termios/cfsetospeed.c
// basically just some pointless implementations that of course don't really matter.
pub export fn cfsetospeed(tio: *termios.termios, speed: termios.speed_t) c_int {
    if ((speed & @bitCast(c_ulong, ~termios.CBAUD)) != 0) {
        errno.errno = errno.EINVAL;
        return -1;
    }
    tio.c_cflag &= @bitCast(c_ulong, ~termios.CBAUD);
    tio.c_cflag |= speed;
    return 0;
}

//int cfsetispeed(struct termios *termios_p, speed_t speed);
pub export fn cfsetispeed(tio: *termios.termios, speed: termios.speed_t) c_int {
    return if (speed != 0) cfsetospeed(tio, speed) else 0;
}

export fn cfgetispeed(tio: *const termios.termios) termios.speed_t {
    return tio.c_cflag & termios.CBAUD;
}

//int cfsetospeed(struct termios *termios_p, speed_t speed);
export fn cfgetospeed(tio: *const termios.termios) termios.speed_t {
    return cfgetispeed(tio);
}
