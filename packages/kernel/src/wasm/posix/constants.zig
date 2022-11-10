pub fn keepalive() void {}
const errno = @import("errno.zig");
const netdb = @import("netdb.zig");
const netif = @import("netif.zig");
const signal = @import("./signal.zig");
const socket = @import("./socket.zig");
const termios = @import("termios.zig");
const unistd = @import("unistd.zig");
const util = @import("util.zig");
const wait = @import("wait.zig");

const _names = errno.constants.names ++ netdb.constants.names ++ netif.constants.names ++ signal.constants.names ++ socket.constants.names ++ termios.constants.names ++ unistd.constants.names ++ wait.constants.names;

const _values = getValues(errno.constants) ++ getValues(netdb.constants) ++ getValues(netif.constants) ++ getValues(signal.constants) ++ getValues(socket.constants) ++ getValues(termios.constants) ++ getValues(unistd.constants) ++ getValues(wait.constants);

const _constants = .{ .names = _names, .values = _values };

// Caller must std.c.free the string it gets back.
export fn getConstants() ?[*:0]u8 {
    return util.structToNullTerminatedJsonString(@TypeOf(_constants), _constants) catch {
        return null;
    };
}

fn getValues(comptime constants: anytype) [constants.names.len]i32 {
    return _getValues(constants.c_import, constants.names.len, constants.names);
}

fn _getValues(comptime c_import: anytype, comptime len: usize, comptime names: [len][:0]const u8) [len]i32 {
    var x: [names.len]i32 = undefined;
    var i = 0;
    for (names) |constant| {
        x[i] = @field(c_import, constant);
        i += 1;
    }
    return x;
}
