pub fn keepalive() void {}
const termios = @cImport(@cInclude("termios.h"));
const std = @import("std");
const expect = std.testing.expect;
const errno = @cImport(@cInclude("errno.h"));

//int cfsetispeed(struct termios *termios_p, speed_t speed);
//int cfsetospeed(struct termios *termios_p, speed_t speed);

// ported from zig/lib/libc/wasi/libc-top-half/musl/src/termios/cfsetospeed.c
pub export fn cfsetospeed(tio: *termios.termios, speed: termios.speed_t) c_int {
    if ((speed & @bitCast(c_ulong, ~termios.CBAUD)) != 0) {
        errno.errno = errno.EINVAL;
        return -1;
    }
    tio.c_cflag &= @bitCast(c_ulong, ~termios.CBAUD);
    tio.c_cflag |= speed;
    return 0;
}

pub export fn cfsetispeed(tio: *termios.termios, speed: termios.speed_t) c_int {
    return if (speed != 0) cfsetospeed(tio, speed) else 0;
}

export fn cfgetispeed(tio: *const termios.termios) termios.speed_t {
    return tio.c_cflag & termios.CBAUD;
}

export fn cfgetospeed(tio: *const termios.termios) termios.speed_t {
    return cfgetispeed(tio);
}

// I can't tell if any of this terinal control stuff is even possible to implement
// for something like xterm.js.  See discussion at
//   https://stackoverflow.com/questions/68778496/how-to-get-stty-echo-mode-from-xterm-js
// Thus the following are minimal stub functions.  There are implementations below
// in terms of ioctl, but it just errors out immediately on WASM.
//
// IMPORTANT! We can't do NOTHING here or, e.g., libedit will randomly not work!
// This is because of the line
//
//    	if (tcgetattr(fileno(rl_instream), &t) != -1 && (t.c_lflag & ECHO) == 0)
//
// in packages/libedit/build/wasm/src/readline.c.   If t.c_lflag doesn't have the ECHO
// flag, then libedit will be totally broken for interactive use.
// We set at least that below for fd=0 and intend to do more (TODO!).
//
//            tcflag_t c_iflag;      /* input modes */
//            tcflag_t c_oflag;      /* output modes */
//            tcflag_t c_cflag;      /* control modes */
//            tcflag_t c_lflag;      /* local modes */
//            cc_t     c_cc[NCCS];   /* special characters */
//
export fn tcgetattr(fd: std.c.fd_t, tio: *termios.termios) c_int {
    // std.debug.print("tcgetattr, fd={}\n", .{fd});
    tio.c_iflag = 0;
    tio.c_oflag = 0;
    tio.c_cflag = 0;
    tio.c_lflag = 0;
    if (fd == 0) {
        tio.c_lflag = termios.ECHO;
    }
    return 0; // success -- got no info into tio.
    //     const TCGETS = 0x5401;
    //     std.debug.print("tcgetattr, fd={}, tio={}\n", .{ fd, tio });
    //     std.debug.print("fd={}, ioctl.ioctl(fd, TCGETS, tio) = {}\n", .{ fd, ioctl.ioctl(fd, TCGETS, tio) });
    //     if (std.c.ioctl(fd, TCGETS, tio) != 0) {
    //         // error when calling icotl.
    //         return -1;
    //     }
    //     return 0;
}

// export fn tcsetattr(fd: std.c.fd_t, act: c_int, tio: *termios.termios) c_int {
//     std.debug.print("tcsetattr, fd={}, act={}, tio={}\n", .{ fd, act, tio });

//     _ = fd;
//     _ = act;
//     _ = tio;
//    return 0;
//         const TCSETS = 0x5402;
//         if (act < 0 or act > 2) {
//             // errno = EINVAL; // TODO
//             std.debug.print("tcsetattr - error EINVAL", .{});
//             return -1;
//         }
//         return ioctl.ioctl(fd, TCSETS + act, tio);
//}
