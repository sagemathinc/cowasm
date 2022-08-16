const errno = @cImport(@cInclude("errno.h"));

pub const constants = [_][:0]const u8{ "EBADF", "ENOENT" };

pub const values = blk: {
    var x: [constants.len]i32 = undefined;
    var i = 0;
    for (constants) |constant| {
        x[i] = @field(errno, constant);
        i += 1;
    }
    break :blk x;
};
