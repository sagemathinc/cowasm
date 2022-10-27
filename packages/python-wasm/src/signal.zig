const std = @import("std");
const python = @cImport(@cInclude("Python.h"));

// wasmGetSignalState has to be defined at the typescript level, since it potentially
// reads from a small SharedArrayBuffer that WASM does not have access to.  It returns
// any pending signal.
extern fn wasmGetSignalState() i32;

export fn _Py_CheckEmscriptenSignals() void {
    const signal = wasmGetSignalState();
    // std.debug.print("python-wasm: _Py_CheckEmscriptenSignals: signal={}\n", .{signal});
    if (signal != 0) {
        // std.debug.print("_Py_CheckEmscriptenSignals: got a signal! {}\n", .{signal});
        if (python.PyErr_SetInterruptEx(signal) != 0) {
            std.debug.print("_Py_CheckEmscriptenSignals: ERROR -- invalid signal = {}\n", .{signal});
        }
    }
}

// Upstream uses 50 for analogue of SIGNAL_INTERVAL (see Python/emscripten_signal.c in the cpython sources).
// However, this may or may not be called frequently, so not checking more could be a problem.  It would
// make a lot more sense to space these out with a high performance system clock... but of course access to
// that is at least as expensive as wasmGetSignalState, so there's no point.
const SIGNAL_INTERVAL: i32 = 50;
var signal_counter: i32 = SIGNAL_INTERVAL;
export fn _Py_CheckEmscriptenSignalsPeriodically() void {
    // std.debug.print("python-wasm: _Py_CheckEmscriptenSignalsPeriodically\n", .{});
    signal_counter -= 1;
    if (signal_counter <= 0) {
        signal_counter = SIGNAL_INTERVAL;
        _Py_CheckEmscriptenSignals();
    }
}

pub fn keepalive() void {}
