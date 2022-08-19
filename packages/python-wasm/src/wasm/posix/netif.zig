const net_if = @cImport(@cInclude("net/if.h"));

pub const constants = .{
    .c_import = net_if,
    .names = [_][:0]const u8{"IFNAMSIZ"},
};
