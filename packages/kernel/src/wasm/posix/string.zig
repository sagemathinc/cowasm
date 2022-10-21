pub fn keepalive() void {}
const string = @cImport(@cInclude("string.h"));
const std = @import("std");
const expect = std.testing.expect;

// This was fun to write, but it's also built into zig via -lwasi-emulated-signal
// export fn strsignal(sig: c_int) [*:0]const u8 {
//     if (sig <= 0 or sig > 31) {
//         return "SIGINVALID";
//     }
//     const SIGNALS: [32]([*:0]const u8) = .{ "SIGINVALID", "SIGHUP", "SIGINT", "SIGQUIT", "SIGILL", "SIGTRAP", "SIGABRT", "SIGBUS", "SIGFPE", "SIGKILL", "SIGUSR1", "SIGSEGV", "SIGUSR2", "SIGPIPE", "SIGALRM", "SIGTERM", "SIGSTKFLT", "SIGCHLD", "SIGCONT", "SIGSTOP", "SIGTSTP", "SIGTTIN", "SIGTTOU", "SIGURG", "SIGXCPU", "SIGXFSZ", "SIGVTALRM", "SIGPROF", "SIGWINCH", "SIGPOLL", "SIGPWR", "SIGSYS" };
//     const n = @intCast(usize, sig);
//     return SIGNALS[n];
// }

// test "strsignal" {
//     try expect(strsignal(1) == "SIGHUP");
//     try expect(strsignal(2) == "SIGINT");
//     try expect(strsignal(0) == "SIGINVALID");
//     try expect(strsignal(32) == "SIGINVALID");
//     try expect(strsignal(31) == "SIGSYS");
// }
