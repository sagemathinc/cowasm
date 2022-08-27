pub fn keepalive() void {}
const std = @import("std");
const spawn = @cImport(@cInclude("spawn.h"));
const errno = @import("./errno.zig").errno;

export fn posix_spawnattr_init(attr: *spawn.posix_spawnattr_t) c_int {
    attr.* = std.mem.zeroInit(spawn.posix_spawnattr_t, .{});
    return 0;
}

export fn posix_spawnattr_destroy(attr: *spawn.posix_spawnattr_t) c_int {
    // no dynamic allocation so nothing to do.
    _ = attr;
    return 0;
}

export fn posix_spawnattr_setflags(attr: *spawn.posix_spawnattr_t, flags: c_int) c_int {
    const all_flags = spawn.POSIX_SPAWN_RESETIDS |
        spawn.POSIX_SPAWN_SETPGROUP |
        spawn.POSIX_SPAWN_SETSIGDEF |
        spawn.POSIX_SPAWN_SETSIGMASK |
        spawn.POSIX_SPAWN_SETSCHEDPARAM |
        spawn.POSIX_SPAWN_SETSCHEDULER |
        spawn.POSIX_SPAWN_USEVFORK |
        spawn.POSIX_SPAWN_SETSID;
    if (flags & ~all_flags != 0) {
        return errno.EINVAL;
    }
    attr.__flags = flags;
    return 0;
}

export fn posix_spawnattr_getflags(attr: *const spawn.posix_spawnattr_t, flags: *c_int) c_int {
    flags.* = attr.__flags;
    return 0;
}

export fn posix_spawnattr_setpgroup(attr: *spawn.posix_spawnattr_t, pgrp: spawn.pid_t) c_int {
    attr.__pgrp = pgrp;
    return 0;
}

export fn posix_spawnattr_getpgroup(attr: *const spawn.posix_spawnattr_t, pgrp: *spawn.pid_t) c_int {
    pgrp.* = attr.__pgrp;
    return 0;
}

export fn posix_spawnattr_setsigmask(attr: *spawn.posix_spawnattr_t, mask: *const spawn.sigset_t) c_int {
    attr.__mask = mask.*;
    return 0;
}

export fn posix_spawnattr_getsigmask(attr: *const spawn.posix_spawnattr_t, mask: *spawn.sigset_t) c_int {
    mask.* = attr.__mask;
    return 0;
}

const expect = std.testing.expect;

test "init a posix_spawnattr, then destroy" {
    var attr: spawn.posix_spawnattr_t = undefined;
    try expect(posix_spawnattr_init(&attr) == 0);
    try expect(posix_spawnattr_destroy(&attr) == 0);
}

test "set a flag and get it" {
    var attr: spawn.posix_spawnattr_t = undefined;
    try expect(posix_spawnattr_init(&attr) == 0);
    try expect(posix_spawnattr_setflags(&attr, spawn.POSIX_SPAWN_SETPGROUP) == 0);
    var flags: c_int = undefined;
    try expect(posix_spawnattr_getflags(&attr, &flags) == 0);
    try expect(flags == spawn.POSIX_SPAWN_SETPGROUP);
}

test "set an invalid flag" {
    var attr: spawn.posix_spawnattr_t = undefined;
    try expect(posix_spawnattr_init(&attr) == 0);
    try expect(posix_spawnattr_setflags(&attr, 12345) == errno.EINVAL);
}

test "set and get a pgroup" {
    var attr: spawn.posix_spawnattr_t = undefined;
    try expect(posix_spawnattr_init(&attr) == 0);
    try expect(posix_spawnattr_setpgroup(&attr, 10) == 0);
    var pgrp: spawn.pid_t = undefined;
    try expect(posix_spawnattr_getpgroup(&attr, &pgrp) == 0);
    try expect(pgrp == 10);
}

test "set and get sigmask" {
    var attr: spawn.posix_spawnattr_t = undefined;
    try expect(posix_spawnattr_init(&attr) == 0);
    var mask0: spawn.sigset_t = 10;
    try expect(posix_spawnattr_setsigmask(&attr, &mask0) == 0);
    var mask: spawn.sigset_t = 0;
    try expect(posix_spawnattr_getsigmask(&attr, &mask) == 0);
    try expect(mask == mask0);
}
