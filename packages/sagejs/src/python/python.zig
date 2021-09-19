const python = @cImport(@cInclude("Python.h"));
const std = @import("std");
pub const General = error{OverflowError};

var didInit = false;
pub fn init() void {
    if (didInit) return;
    didInit = true;
    python.Py_Initialize();
}

pub fn exec(s: [*:0]const u8) !void {
    _ = python.PyRun_SimpleString(s);
}

pub fn add() void {
    init();
    _ = python.PyRun_SimpleString("print('1 + ... + 100 = ', sum(range(101)))\n");
}

test "do something" {
    _ = add();
    python.Py_FinalizeEx();
}
