const c = @cImport({
    @cInclude("posix-wasm.h");
});

pub const constants = [_][:0]const u8{ "SIG_BLOCK", "SIG_UNBLOCK", "SIG_SETMASK" };

pub const values = blk: {
    var x: [constants.len]i32 = undefined;
    var i = 0;
    for (constants) |constant| {
        x[i] = @field(c, constant);
        i += 1;
    }
    break :blk x;
};
