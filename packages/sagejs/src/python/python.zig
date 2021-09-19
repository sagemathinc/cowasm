const python = @cImport(@cInclude("Python.h"));
const std = @import("std");

export fn init() void {
    python.Py_Initialize();
}

export fn add() c_int {
    python.Py_Initialize();
    _ = python.PyRun_SimpleString("print('1 + ... + 100 = ', sum(range(101)))\n");
    return python.Py_FinalizeEx();
}

test "do something" {
    _ = add();
}
