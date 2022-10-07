pub const constants = .{ .c_import = @cImport(@cInclude("sys/wait.h")), .names = [_][:0]const u8{ "WNOHANG", "WUNTRACED" } };
