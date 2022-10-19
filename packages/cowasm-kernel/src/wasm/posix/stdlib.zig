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

// This is missing from zig's libc for some reason, so i just ported it from
// zig/lib/libc/wasi/libc-top-half/musl/src/locale/strtod_l.c
// since it is needed by numpy and is part of stdlib officially.

// long double strtold_l(const char *restrict s, char **restrict p, locale_t l)
export fn strtold_l(s: [*c]const u8, p: [*c][*c]u8, l: *anyopaque) f128 {
    _ = l;
    return stdlib.strtold(s, p);
}
