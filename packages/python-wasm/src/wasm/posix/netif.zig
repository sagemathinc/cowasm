const std = @import("std");
const net_if = @cImport({
    @cDefine("if_nameindex_struct", "struct if_nameindex");
    @cInclude("net/if.h");
});

pub const constants = .{
    .c_import = net_if,
    .names = [_][:0]const u8{"IFNAMSIZ"},
};

export fn createNameIndexArray(len: usize) ?[*]net_if.if_nameindex_struct {
    const voidPtr = std.c.malloc((len + 1) * @sizeOf(net_if.if_nameindex_struct)) orelse return null;
    const ni = @ptrCast([*]net_if.if_nameindex_struct, @alignCast(std.meta.alignment(*net_if.if_nameindex_struct), voidPtr));
    setNameIndexElement(ni, len, 0, null);
    return ni;
}

export fn setNameIndexElement(ni: [*]net_if.if_nameindex_struct, i: usize, if_index: u32, if_name: ?[*:0]u8) void {
    ni[i].if_index = if_index;
    ni[i].if_name = if_name;
}

export fn freeNameIndexArray(ni: [*]net_if.if_nameindex_struct) void {
    var i: usize = 0;
    while (ni[i].if_index != 0) : (i += 1) {
        std.c.free(ni[i].if_name);
    }
    std.c.free(ni);
}
