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
    dst[i] = 0; // null terminate string.
    // std.debug.print("strunvis src={s}, dst={s}\n", .{ src, dst });
    return @intCast(c_int, i);
}

export fn strvis(dst: [*:0]u8, src: [*:0]const u8, flag: c_int) c_int {
    // we ignore the flag which "alters visual representation".
    _ = flag;
    var i: usize = 0;
    while (src[i] != 0) : (i += 1) {
        dst[i] = src[i];
    }
    dst[i] = 0; // null terminate string.
    // std.debug.print("strvis src={s}, dst={s}\n", .{ src, dst });
    return @intCast(c_int, i);
}

// int strnvis(char* dst, const char* src, size_t size, int flag);
// "The strnvis() function encodes characters from src up to the first NUL or the end of dst, as indicated by size. The strvisx() function encodes exactly len characters from src (this is useful for encoding a block of data that may contain NULs). All three forms NUL terminate dst, except for strnvis() when size is zero, in which case dst is not touched. strnvis() returns the length that dst would become if it were of unlimited size (similar to snprintf(3) or strlcpy(3)). This can be used to detect truncation but it also means that the return value of strnvis() must not be used without checking it against size."
export fn strnvis(dst: [*:0]u8, src: [*:0]const u8, size: usize, flag: c_int) c_int {
    _ = flag;
    var i: usize = 0;
    while (src[i] != 0 and i < size - 1) : (i += 1) {
        dst[i] = src[i];
    }
    if (i < size) {
        dst[i] = 0;
    }
    while (src[i] != 0) : (i += 1) {}
    return @intCast(c_int, i);
}

//char * textdomain (const char * domainname);
//char * gettext (const char * msgid);
//char * dgettext (const char * domainname, const char * msgid);
//char * dcgettext (const char * domainname, const char * msgid, int category);
// "In the "C" locale, or if none of the used catalogs contain a translation for msgid, the gettext, dgettext and dcgettext functions return msgid."
export fn textdomain(domainname: [*:0]const u8) [*:0]const u8 {
    return domainname;
}

export fn gettext(msgid: [*:0]const u8) [*:0]const u8 {
    return msgid;
}

export fn dgettext(domainname: [*:0]const u8, msgid: [*:0]const u8) [*:0]const u8 {
    _ = domainname;
    return msgid;
}

export fn dcgettext(domainname: [*:0]const u8, msgid: [*:0]const u8, category: c_int) [*:0]const u8 {
    _ = domainname;
    _ = category;
    return msgid;
}
