pub fn keepalive() void {}
const std = @import("std");
const expect = std.testing.expect;
const unistd = @cImport({
    @cInclude("unistd.h");
    @cInclude("fcntl.h"); // just needed for constants
});

pub const constants = .{
    .c_import = unistd,
    .names = [_][:0]const u8{ "O_CLOEXEC", "O_NONBLOCK", "F_ULOCK", "F_LOCK", "F_TLOCK", "F_TEST" },
};

// uid_t geteuid(void);
extern fn _geteuid() unistd.uid_t ;
export fn geteuid() unistd.uid_t {
    return _geteuid();
}

// int fchown(int fd, uid_t owner, gid_t group);
extern fn _fchown(fd : c_int, owner : unistd.uid_t, group:unistd.gid_t) c_int;
export fn fchown(fd : c_int, owner : unistd.uid_t, group:unistd.gid_t) c_int {
    return _fchown(fd, owner, group);
}