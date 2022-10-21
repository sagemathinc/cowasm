const std = @import("std");
// const py = @cImport(@cInclude("Python.h"));
// const unistd = @cImport(@cInclude("unistd.h"));

// pub const General = error{ OverflowError, RuntimeError };
// const PyObject = py.PyObject;

// var didInit = false;
// var globals: *PyObject = undefined;
// pub fn init() !void {
//     if (didInit) return;
//     //std.debug.print("python.init()...\n", .{});
//     py.Py_Initialize();
//     // std.debug.print("success!\n", .{});
//     globals = py.PyDict_New() orelse {
//         return General.RuntimeError;
//     };
//     // Success!
//     didInit = true;
// }

export fn cowasm_python_init() void {
    std.debug.print("in WASM! cowasm_python_init.init()...\n", .{});
}
