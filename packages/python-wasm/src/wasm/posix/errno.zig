const errno = @cImport(@cInclude("errno.h"));

pub const CONSTANTS = [_][:0]const u8{ "EBADF", "ENOENT" };

pub const VALUES = blk: {
    var values: [CONSTANTS.len]i32 = undefined;
    var i = 0;
    for (CONSTANTS) |constant| {
        values[i] = @field(errno, constant);
        i += 1;
    }
    break :blk values;
};
