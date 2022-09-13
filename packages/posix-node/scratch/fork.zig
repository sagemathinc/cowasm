// zig run fork.zig

const c = @cImport({
    @cInclude("unistd.h");
    @cInclude("fcntl.h"); // just needed for constants
    @cInclude("grp.h"); // getgrouplist on linux
    @cDefine("struct__OSUnalignedU16", "uint16_t");
    @cDefine("struct__OSUnalignedU32", "uint32_t");
    @cDefine("struct__OSUnalignedU64", "uint64_t");
    @cInclude("sys/wait.h");
});
const std = @import("std");
const log = std.debug.print;

const Errors = error{RuntimeError};

pub fn main() !void {
    var stdin: [2]c_int = undefined;
    if (c.pipe(&stdin) == -1) {
        return Errors.RuntimeError;
    }
    log("stdin pipe {any}\n", .{stdin});

    var stdout: [2]c_int = undefined;
    if (c.pipe(&stdout) == -1) {
        return Errors.RuntimeError;
    }
    log("stdout pipe {any}\n", .{stdout});

    const pid = c.fork();
    if (pid == -1) {
        log("fork error\n", .{});
        return Errors.RuntimeError;
    }
    if (pid == 0) {
        log("in child process\n", .{});
        if (c.dup2(stdin[0], 0) == -1) {
            log("dup2 stdin fail\n", .{});
            return Errors.RuntimeError;
        }
        if (c.dup2(stdout[1], 1) == -1) {
            log("dup2 stdout fail\n", .{});
            return Errors.RuntimeError;
        }
        if (c.close(stdin[0]) == -1) {
            log("failed to close stdin[0] pipe\n", .{});
        }
        if (c.close(stdin[1]) == -1) {
            log("failed to close stdin[1] pipe\n", .{});
        }
        if (c.close(stdout[0]) == -1) {
            log("failed to close stdout[0] pipe\n", .{});
        }
        if (c.close(stdout[1]) == -1) {
            log("failed to close stdout[1] pipe\n", .{});
        }

        const len = 1;
        var memory = std.c.malloc(@sizeOf(?[*:0]u8) * (len + 1)) orelse {
            return Errors.RuntimeError;
        };
        var aligned = @alignCast(std.meta.alignment([*](?[*:0]u8)), memory);
        var s: [*](?[*:0]u8) = @ptrCast([*](?[*:0]u8), aligned);
        s[len] = null;
        const cmd = "/bin/cat";
        s[0] = @ptrCast([*:0]u8, cmd);

        if (c.execv(@ptrCast([*:0]u8, cmd), s) == -1) {
            log("failed to execv", .{});
            return Errors.RuntimeError;
        }
    } else {
        log("in parent process; child={}\n", .{pid});
        if (c.write(stdin[1], "hello", 5) == -1) {
            log("failed to write to stdin\n", .{});
            return Errors.RuntimeError;
        }
        if (c.close(stdin[1]) == -1) {
            log("failed to close stdin pipe\n", .{});
            return Errors.RuntimeError;
        }
        log("closed stdin\n", .{});
        var buf = [_]u8{0} ** 100;
        if (c.read(stdout[0], &buf, 5) == -1) {
            log("failed to read from stdout\n", .{});
            return Errors.RuntimeError;
        }
        buf[5] = 0;
        log("read '{s}' from stdout\n", .{buf});

        var wstatus: c_int = undefined;
        const ret = c.waitpid(pid, &wstatus, 0);
        if (ret == -1) {
            log("error calling waitpid\n", .{});
            return Errors.RuntimeError;
        }
        log("ret = {d}, wstatus = {d}\n", .{ ret, wstatus });
    }
}
