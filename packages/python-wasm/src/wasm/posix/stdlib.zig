pub fn keepalive() void {}
const stdlib = @cImport(@cInclude("stdlib.h"));
const std = @import("std");
const expect = std.testing.expect;

// "The secure_getenv() function is intended for use in general-purpose libraries to avoid
// vulnerabilities that could occur if set-user-ID or set-group-ID programs accidentally
// trusted the environment."  It is equal to getenv when this isn't an issue, and for
// webassembly it isn't.
export fn secure_getenv(name: [*:0]const u8) ?[*:0]u8 {
    return std.c.getenv(name);
}
