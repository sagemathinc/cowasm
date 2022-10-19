// These constants are actually only defined by us in posix-wasm.h, since they
// aren't part of WASI at all.

pub const constants = .{ .c_import = @cImport(@cInclude("posix-wasm.h")), .names = [_][:0]const u8{ "WNOHANG", "WUNTRACED" } };
