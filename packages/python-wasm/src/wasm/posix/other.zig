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

// char * bindtextdomain (const char * domainname, const char * dirname);
export fn bindtextdomain(domainname: [*:0]const u8, dirname: [*:0]const u8) [*:0]const u8 {
    _ = domainname;
    // this is probably enough of a "stub" for now:
    return dirname;
}

// Weirdly on wasm @cimport from sys/statvfs.h yields an opaque type for statvfs, so I copy pasted.
const statvfs = @cImport(@cInclude("sys/statvfs.h"));
const fsblkcnt_t = statvfs.fsblkcnt_t;
const fsfilcnt_t = statvfs.fsfilcnt_t;

const struct_statvfs = struct {
    f_bsize: c_ulong,
    f_frsize: c_ulong,
    f_blocks: fsblkcnt_t,
    f_bfree: fsblkcnt_t,
    f_bavail: fsblkcnt_t,
    f_files: fsfilcnt_t,
    f_ffree: fsfilcnt_t,
    f_favail: fsfilcnt_t,
    f_fsid: c_ulong,
    padding: u32, // 32 = 8*(2*sizeof(int)-sizeof(long)) in WASM; this is in the header file
    f_flag: c_ulong,
    f_namemax: c_ulong,
    __reserved: [6]c_int,
};

export fn set_statvfs(buf: *struct_statvfs, f_bsize: c_ulong, f_frsize: c_ulong, f_blocks: fsblkcnt_t, f_bfree: fsblkcnt_t, f_bavail: fsblkcnt_t, f_files: fsfilcnt_t, f_ffree: fsfilcnt_t, f_favail: fsfilcnt_t, f_fsid: c_ulong, f_flag: c_ulong, f_namemax: c_ulong) void {
    buf.f_bsize = f_bsize;
    buf.f_frsize = f_frsize;
    buf.f_blocks = f_blocks;
    buf.f_bfree = f_bfree;
    buf.f_bavail = f_bavail;
    buf.f_files = f_files;
    buf.f_ffree = f_ffree;
    buf.f_favail = f_favail;
    buf.f_fsid = f_fsid;
    buf.f_flag = f_flag;
    buf.f_namemax = f_namemax;
}

// This is easy, but missing from zig impl, but
// needed by some things, e.g., coreutils:tail:
// int getpagesize(void);
const limits = @cImport(@cInclude("limits.h"));
export fn getpagesize() c_int {
    return limits.PAGE_SIZE;
}

//
// Commented out since I realized that there's some emulation of this in wasi, which we will use for now.
//
// const errno = @import("errno.zig");
// // #include <sys/mman.h>
// const mman = @cImport(@cInclude("sys/mman.h"));
// These mmap functions are not implemented at all yet.   However, at least we can make them clearly fail.
// void *mmap(void *addr, size_t length, int prot, int flags, int fd, off_t offset);
//      "On success, mmap() returns a pointer to the mapped area.  On error, the value MAP_FAILED
//      (that is, (void *) -1) is returned, and errno is set to indicate the cause of the error."
// export fn mmap(addr: *anyopaque, length: c_long, prot: c_int, flags: c_int, fd: c_int, offset: mman.off_t) ?*anyopaque {
//     _ = addr;
//     _ = length;
//     _ = prot;
//     _ = flags;
//     _ = fd;
//     _ = offset;
//     errno.setErrno(errno.errno.ENODEV);
//     return mman.MAP_FAILED;
// }

// // int munmap(void *addr, size_t length);
// //      "On success, munmap() returns 0.  On failure, it returns -1, and errno is set to indicate
// //       the cause of the error (probably to EINVAL)."
// export fn munmap(addr: *anyopaque, length: c_long) c_int {
//     _ = addr;
//     _ = length;
//     errno.setErrno(errno.errno.EINVAL);
//     return -1;
// }
