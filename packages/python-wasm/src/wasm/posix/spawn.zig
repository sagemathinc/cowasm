pub fn keepalive() void {}
const std = @import("std");
const spawn = @cImport(@cInclude("spawn.h"));
const errno = @import("./errno.zig");

export fn posix_spawnattr_init(attr: *spawn.posix_spawnattr_t) c_int {
    attr.* = std.mem.zeroInit(spawn.posix_spawnattr_t, .{});
    return 0;
}

export fn posix_spawnattr_destroy(attr: *spawn.posix_spawnattr_t) c_int {
    // no dynamic allocation so nothing to do.
    _ = attr;
    return 0;
}

export fn posix_spawnattr_setflags(attr: *spawn.posix_spawnattr_t, flags: c_short) c_int {
    const all_flags = spawn.POSIX_SPAWN_RESETIDS |
        spawn.POSIX_SPAWN_SETPGROUP |
        spawn.POSIX_SPAWN_SETSIGDEF |
        spawn.POSIX_SPAWN_SETSIGMASK |
        spawn.POSIX_SPAWN_SETSCHEDPARAM |
        spawn.POSIX_SPAWN_SETSCHEDULER |
        spawn.POSIX_SPAWN_USEVFORK |
        spawn.POSIX_SPAWN_SETSID;
    if (flags & ~all_flags != 0) {
        return errno.errno.EINVAL;
    }
    attr.__flags = flags;
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

