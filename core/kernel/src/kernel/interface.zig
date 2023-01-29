const std = @import("std");
const cowasm = @import("./cowasm.zig");
const posix = @import("../wasm/posix.zig");

export fn keepalive() void {
    posix.keepalive();
}

extern fn wasmSetException() void;

export fn cowasm_exec(argc: i32, argv: [*c][*c]u8) i32 {
    return cowasm.exec(argc, argv) catch |err| {
        wasmSetException();
        std.debug.print("error: '{}'\nwhen starting {}", .{ err, argv[0] });
        return 1;
    };
}

export fn c_malloc(n: usize) ?*anyopaque {
    return std.c.malloc(n);
}

export fn c_free(ptr: ?*anyopaque) void {
    return std.c.free(ptr);
}

// The python-wasm package defines a real version of this at the compiled level that
// does something.  The problem is that properly defining these in the kernel packages
// requires importing a bunch of functionality from Python, which makes the kernel
// much larger.  We need these though in order to run the standalone python.wasm
// binary that the cpython build creates, e.g., since that is very useful for build
// systems, and also doesn't need signal handling (yet).
// NOTE: It i critical that this is defined in *Zig* not *Typescript*, since
// it gets called a lot and defining in Typescript makes Python overall massively
// slower, e.g., the mpmath test suite takes 100x longer.
export fn _Py_CheckEmscriptenSignals() void {}

export fn _Py_CheckEmscriptenSignalsPeriodically() void {
    // std.debug.print("kernel: _Py_CheckEmscriptenSignalsPeriodically\n", .{});
}

// TODO: figure out what this is... Building zig with target wasm32-emscripten
// makes it so this is required.  It gets called a lot.
export fn emscripten_return_address(unknown: i32) i32 {
    _ = unknown;
    return 0;
}
