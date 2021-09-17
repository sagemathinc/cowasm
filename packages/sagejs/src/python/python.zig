const python = @cImport(@cInclude("Python.h"));
const std = @import("std");

var isInitialized = false;
export fn init() void {
    if (isInitialized) return;
    isInitialized = true;
    python.Py_Initialize();
}

export fn finalize() c_int {
    if (!isInitialized) return 0;
    isInitialized = false;
    return python.Py_FinalizeEx();
}

export fn add() void {
    _ = python.PyRun_SimpleString("print('2 + 3 =', 2 + 3)\n");
}

const expect = std.testing.expect;
test "calling init" {
    init();
    add();
    _ = finalize();
}
