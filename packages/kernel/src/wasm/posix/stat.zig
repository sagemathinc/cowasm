pub fn keepalive() void {}
const stat = @cImport(@cInclude("sys/stat.h"));
const std = @import("std");
const expect = std.testing.expect;


// int fchmod(int fildes, mode_t mode);
extern fn _fchmod(fildes : c_int, mode : stat.mode_t) c_int;
export fn fchmod(fildes : c_int, mode : stat.mode_t) c_int {
    return _fchmod(fildes, mode);
}