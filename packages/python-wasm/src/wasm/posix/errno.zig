pub fn keepalive() void {}
pub const errno = @cImport(@cInclude("errno.h"));

pub const constants = .{ .c_import = errno, .names = [_][:0]const u8{ "E2BIG", "EACCES", "EBADF", "EBUSY", "ECHILD", "EDEADLK", "EEXIST", "EFAULT", "EFBIG", "EINTR", "EINVAL", "EIO", "EISDIR", "EMFILE", "EMLINK", "ENFILE", "ENODEV", "ENOENT", "ENOEXEC", "ENOMEM", "ENOSPC", "ENOTDIR", "ENOTTY", "ENXIO", "EPERM", "EPIPE", "EROFS", "ESPIPE", "ESRCH", "ETXTBSY", "EXDEV" } };

pub export fn setErrno(error_number: i32) void {
    errno.errno = error_number;
}
