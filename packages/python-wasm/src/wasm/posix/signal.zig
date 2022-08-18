pub const constants = .{ .c_import = @cImport(@cInclude("posix-wasm.h")), .names = [_][:0]const u8{ "SIG_BLOCK", "SIG_UNBLOCK", "SIG_SETMASK" } };
