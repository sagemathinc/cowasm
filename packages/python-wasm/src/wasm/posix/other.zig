pub fn keepalive() void {}
const stdio = @cImport(@cInclude("stdio.h"));
const std = @import("std");
const expect = std.testing.expect;

// "The interface __stack_chk_fail() shall abort the function that called it
// with a message that a stack overflow has been detected. The program that
// called the function shall then exit.  The interface
// __stack_chk_fail() does not check for a stack overflow itself. It merely
// reports one when invoked."
export fn __stack_chk_fail() void {
    const stderr = std.io.getStdErr().writer();
    stderr.print("A stack overflow has been detected.\n", .{}) catch |e| {
        std.debug.print("A stack overflow has been detected. - {}\n", .{e});
    };
    std.process.exit(1);
}

//  "The strunvis() function decodes the characters pointed to by src into the
//  buffer pointed to by dst.	The strunvis() function	simply copies src to
//  dst, decoding any escape sequences	along the way, and returns the number
//  of	characters placed into dst, or -1 if an	invalid	escape sequence	was
//  detected.	The size of dst	should be equal	to the size of src (that is,
//  no	expansion takes	place during decoding).""
export fn strunvis(dst: [*:0]u8, src: [*:0]const u8) c_int {
    var i: usize = 0;
    while (src[i] != 0) : (i += 1) {
        dst[i] = src[i];
    }
    return @intCast(c_int, i);
}

export fn strvis(dst: [*:0]u8, src: [*:0]const u8, flag: c_int) c_int {
    // we ignore the flag which "alters visual representation".
    _ = flag;
    var i: usize = 0;
    while (src[i] != 0) : (i += 1) {
        dst[i] = src[i];
    }
    return @intCast(c_int, i);
}
