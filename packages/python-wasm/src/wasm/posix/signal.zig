const c = @cImport({
    @cInclude("posix-wasm.h");
});

pub const CONSTANTS = [_][:0]const u8{ "SIG_BLOCK", "SIG_UNBLOCK", "SIG_SETMASK" };

pub const VALUES = blk: {
    var values: [CONSTANTS.len]i32 = undefined;
    var i = 0;
    for (CONSTANTS) |constant| {
        values[i] = @field(c, constant);
        i += 1;
    }
    break :blk values;
};
