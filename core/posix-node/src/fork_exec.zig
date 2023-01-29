const c = @import("c.zig");
const node = @import("node.zig");
const std = @import("std");
const clib = @cImport({
    @cDefine("struct__OSUnalignedU16", "uint16_t");
    @cDefine("struct__OSUnalignedU32", "uint32_t");
    @cDefine("struct__OSUnalignedU64", "uint64_t");
    @cInclude("fcntl.h");
    @cInclude("sys/wait.h");
    @cInclude("unistd.h");
    @cInclude("stdlib.h");
});
const util = @import("util.zig");

pub fn register(env: c.napi_env, exports: c.napi_value) !void {
    try node.registerFunction(env, exports, "fork_exec", forkExec);
    try node.registerFunction(env, exports, "set_inheritable", set_inheritable_impl);
    try node.registerFunction(env, exports, "is_inheritable", is_inheritable_impl);
}

const Errors = error{ CloseError, CWDError, DupError, Dup2Error, ForkError, ExecError, SetInheritableReadFlags, SetInheritableSETFD, SetWasiFdError };

// {
//     exec_array: string[];
//     argv: string[];
//     envp: string[];
//     cwd: string;
//     p2cread: number;
//     p2cwrite: number;
//     c2pread: number;
//     c2pwrite: number;
//     errread: number;
//     errwrite: number;
//     errpipe_read: number;
//     errpipe_write: number;
//     err_map: { [native: number]: number };
// }

fn forkExec(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const args = node.getArgv(env, info, 1) catch return null;
    const opts = args[0];
    return forkExec1(env, opts) catch return null;
}

fn forkExec1(env: c.napi_env, opts: c.napi_value) !c.napi_value {
    const exec_array = try node.getNamedProperty(env, opts, "exec_array", "exec_array field (a string[])");
    var exec_array_c = try node.valueToArrayOfStrings(env, exec_array, "exec_array");
    defer util.freeArrayOfStrings(exec_array_c);

    const argv = try node.getNamedProperty(env, opts, "argv", "argv field (a string[])");
    var argv_c = try node.valueToArrayOfStrings(env, argv, "argv");
    defer util.freeArrayOfStrings(argv_c);

    const envp = try node.getNamedProperty(env, opts, "envp", "envp field (a string[])");
    var envp_c = try node.valueToArrayOfStrings(env, envp, "envp");
    defer util.freeArrayOfStrings(envp_c);

    // TODO: what about utf-8 and unicode?
    const cwd = try node.getNamedProperty(env, opts, "cwd", "cwd field (a string)");
    var cwd_c = try node.valueToString(env, cwd, "current working directory");
    defer std.c.free(cwd_c);

    const WASI_FD_INFO = try node.getNamedProperty(env, opts, "WASI_FD_INFO", "WASI_FD_INFO field (a string)");
    var WASI_FD_INFO_c = try node.valueToString(env, WASI_FD_INFO, "WASI_FD_INFO field");
    defer std.c.free(WASI_FD_INFO_c);

    // stdin (=p2c = python to c), stdout (=c2p = c to python), stderr = (err):
    const p2cread = try i32Prop(env, opts, "p2cread");
    const p2cwrite = try i32Prop(env, opts, "p2cwrite");
    const c2pread = try i32Prop(env, opts, "c2pread");
    const c2pwrite = try i32Prop(env, opts, "c2pwrite");
    const errread = try i32Prop(env, opts, "errread");
    const errwrite = try i32Prop(env, opts, "errwrite");
    // and also the special errpipe:
    const errpipe_read = try i32Prop(env, opts, "errpipe_read");
    const errpipe_write = try i32Prop(env, opts, "errpipe_write");

    // whether or not to close file descriptors
    const close_fds = try i32Prop(env, opts, "close_fds");
    // fd's to not close
    const fds_to_keep = try node.getNamedProperty(env, opts, "fds_to_keep", "file descriptors to keep");
    var fds_to_keep_len: u32 = undefined;
    const fds_to_keep_c = try node.valueToArrayOfI32(env, fds_to_keep, "fds_to_keep", &fds_to_keep_len);
    defer std.c.free(fds_to_keep_c);

    // err_map
    const err_map = try node.getNamedProperty(env, opts, "err_map", "native to wasm error mapping");
    var err_map_len: u32 = undefined;
    const err_map_c = try node.valueToArrayOfI32(env, err_map, "err_map", &err_map_len);
    defer std.c.free(err_map_c);

    /////////////////////    /////////////////////     /////////////////////
    // IMPORTANT!  Do NOT use anything from the nodejs runtime below this point!
    /////////////////////    /////////////////////     /////////////////////

    const pid = clib.fork();
    if (pid == -1) {
        // TODO: write to the error pipe.
        node.throwErrno(env, "fork system call failed");
        return null;
    }
    if (pid != 0) {
        // parent -- we're done with everything we need to do here.
        // NOTE: the way python uses fork_exec is that even if all the
        // forks fail, we do NOT report an error directly.  Instead,
        // an error message is sent via a pipe.
        return try node.create_i32(env, pid, "pid");
    }
    // We're the child.

    // Get rid of all the other node async io and threads by closing
    // the lib-uv event loop, which would otherwise cause random hangs.
    try node.closeEventLoop(env);
    doExec(exec_array_c, argv_c, envp_c, cwd_c, p2cread, p2cwrite, c2pread, c2pwrite, errread, errwrite, errpipe_read, errpipe_write, close_fds, fds_to_keep_c, fds_to_keep_len, WASI_FD_INFO_c) catch |err| {
        std.debug.print("Error in doExec: {}\n", .{err});
        // every exec failed, so we report this error over the pipe:

        var buffer: [128]u8 = undefined;
        var fba = std.heap.FixedBufferAllocator.init(&buffer);
        const allocator = fba.allocator();
        const errno = util.getErrno();
        const errnoWasm = if (errno >= 0 and errno < err_map_len) err_map_c[@intCast(u32, errno)] else -1;

        // Data format for errpipe_write:  "exception name:hex errno:description"
        // TODO: subtle bug still -- we need to somehow translate the error number,
        // since the errno here is for node native and we need the wasi one...
        const mesg = try std.fmt.allocPrint(
            allocator,
            "OSError:{x}:{s}",
            .{ errnoWasm, if (err == Errors.ExecError) "exec" else "noexec" },
        );
        defer allocator.free(mesg);
        if (clib.write(errpipe_write, @ptrCast([*]u8, mesg), mesg.len) == -1) {
            // this is very unlikely to be visible and there isn't anything we can do.
            std.debug.print("Error writing to pipe.\n", .{});
        }

        _ = clib.exit(0);
    };
    // impossible to get here...
    unreachable;
}

fn i32Prop(env: c.napi_env, opts: c.napi_value, comptime prop: [:0]const u8) !i32 {
    const x = try node.getNamedProperty(env, opts, prop, prop);
    return try node.i32FromValue(env, x, prop);
}

fn setInheritable(fd: i32, inheritable: bool) !void {
    var flags = clib.fcntl(fd, clib.F_GETFD, @intCast(c_int, 0));
    if (flags < 0) {
        return Errors.SetInheritableReadFlags;
    }
    if (inheritable) {
        flags &= ~clib.FD_CLOEXEC; // clear FD_CLOEXEC bit
    } else {
        flags |= clib.FD_CLOEXEC; // set FD_CLOEXEC bit
    }
    if (clib.fcntl(fd, clib.F_SETFD, flags) == -1) {
        return Errors.SetInheritableSETFD;
    }
}

fn set_inheritable_impl(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const args = node.getArgv(env, info, 2) catch return null;
    const fd = node.i32FromValue(env, args[0], "fd") catch return null;
    const inheritable = node.valueToBool(env, args[1], "inheritable") catch return null;

    setInheritable(fd, inheritable) catch {
        node.throwErrno(env, "set_inheritable call failed");
    };
    return null;
}

fn isInheritable(fd: i32) !bool {
    var flags = clib.fcntl(fd, clib.F_GETFD, @intCast(c_int, 0));
    if (flags < 0) {
        return Errors.SetInheritableReadFlags;
    }
    // inheritable means the FD_CLOEXEC bit is NOT set in flags, i.e.,
    // do not
    return flags & clib.FD_CLOEXEC == 0;
}

fn is_inheritable_impl(env: c.napi_env, info: c.napi_callback_info) callconv(.C) c.napi_value {
    const args = node.getArgv(env, info, 1) catch return null;
    const fd = node.i32FromValue(env, args[0], "fd") catch return null;
    const status = isInheritable(fd) catch {
        node.throwErrno(env, "is_inheritable call failed");
        return null;
    };
    return node.create_bool(env, status, "inheritable status") catch return null;
}

fn close(fd: i32) !void {
    if (clib.close(fd) != 0) {
        return Errors.CloseError;
    }
}

fn dup(fd: i32) !i32 {
    const new_fd = clib.dup(fd);
    if (new_fd == -1) {
        return Errors.DupError;
    }
    return new_fd;
}

fn dup2(fd: i32, new_fd: i32) !void {
    if (clib.dup2(fd, new_fd) == -1) {
        return Errors.Dup2Error;
    }
}

fn doExec(exec_array: [*](?[*:0]u8), argv: [*](?[*:0]u8), envp: [*](?[*:0]u8), cwd: [*:0]u8, p2cread: i32, p2cwrite: i32, c2pread: i32, _c2pwrite: i32, errread: i32, _errwrite: i32, errpipe_read: i32, errpipe_write: i32, close_fds: i32, fds_to_keep: [*]i32, fds_to_keep_len: u32, WASI_FD_INFO: [*:0]u8) !void {

    // TODO: bunch of stuff here regarding pipes and uid/gid. This is a direct port
    // of child_exec from cpython's Modules/_posixsubprocess.c, with some
    // comments copied to keep things anchored.

    if (envp[0] == null) {
        // set WASI_FD_INFO to WASI_FD_INFO_c so child has access to this information
        // and wasi-js can reconstruct correct file descriptor table.
        // In case envp_c is nontrivial, this should have already been done.
        if (clib.setenv("WASI_FD_INFO", WASI_FD_INFO, 1) == -1) {
            return Errors.SetWasiFdError;
        }
    }

    if (fds_to_keep_len > 0) {
        var i: usize = 0;
        while (i < fds_to_keep_len) : (i += 1) {
            if (fds_to_keep[i] != errpipe_write) {
                try setInheritable(fds_to_keep[i], true);
            }
        }
    }

    // Close parent's pipe ends:
    if (p2cwrite != -1) {
        try close(p2cwrite);
    }
    if (c2pread != -1) {
        try close(c2pread);
    }
    if (errread != -1) {
        try close(errread);
    }
    try close(errpipe_read);

    // When duping fds, if there arises a situation where one of the fds is
    // either 0, 1 or 2, it is possible that it is overwritten (#12607).
    var c2pwrite = _c2pwrite;
    if (c2pwrite == 0) {
        c2pwrite = try dup(c2pwrite);
        try setInheritable(c2pwrite, false);
    }
    var errwrite = _errwrite;
    while (errwrite == 0 or errwrite == 1) {
        errwrite = try dup(errwrite);
        try setInheritable(errwrite, false);
    }

    // Dup fds for child.
    // dup2() removes the CLOEXEC flag but we must do it ourselves if dup2()
    // would be a no-op (issue #10806).
    if (p2cread == 0) {
        try setInheritable(p2cread, true);
    } else if (p2cread != -1) {
        try dup2(p2cread, 0); // stdin
    }

    if (c2pwrite == 1) {
        try setInheritable(c2pwrite, true);
    } else if (c2pwrite != -1) {
        try dup2(c2pwrite, 1); // stdout
    }

    if (errwrite == 2) {
        try setInheritable(errwrite, true);
    } else if (errwrite != -1) {
        try dup2(errwrite, 2); // stderr
    }

    if (node.strlen(cwd) > 0) {
        if (clib.chdir(cwd) != 0) {
            return Errors.CWDError;
        }
    }

    // TODO: child_umask
    // TODO: call_setsid
    // TODO: call_setgroups
    // TODO: call_setgid
    // TODO: call_setuid

    if (close_fds != 0) {
        closeOpenFds(3, errpipe_write, fds_to_keep, fds_to_keep_len);
    }

    // Make it so errpipe_write is closed when an exec succeeds
    // This is the default, so this line is not necessary.  But I'm
    // keeping it to make things very clear for now.
    try setInheritable(errpipe_write, false);

    // Try each executable in turn until one of them works.  In practice this
    // is trying every possible location in the PATH.
    var i: usize = 0;
    while (exec_array[i] != null) : (i += 1) {
        if (envp[0] != null) {
            _ = clib.execve(exec_array[i], argv, envp);
        } else {
            _ = clib.execv(exec_array[i], argv);
        }
        // If we're here, it didn't work.  Will try next one if possible...
    }
    return Errors.ExecError;
}

// stupidly inefficient since len is tiny in practice (todo?).
fn isInList(fd: i32, v: [*]i32, len: u32) bool {
    var j: u32 = 0;
    while (j < len) : (j += 1) {
        if (v[j] == fd) {
            return true;
        }
    }
    return false;
}

fn closeOpenFds(start_fd: i32, errpipe_write: i32, fds_to_keep: [*]i32, fds_to_keep_len: u32) void {
    var fd = start_fd;
    while (fd < 256) : (fd += 1) {
        if (fd == errpipe_write) continue;
        if (!isInList(fd, fds_to_keep, fds_to_keep_len)) {
            // ignore errors
            _ = clib.close(fd);
        }
    }
}
