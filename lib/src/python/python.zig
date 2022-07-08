const python = @cImport(@cInclude("Python.h"));
const std = @import("std");
pub const General = error{ OverflowError, RuntimeError };

var didInit = false;
var globals: *python.PyObject = undefined;
pub fn init() void {
    if (didInit) return;
    didInit = true;
    std.debug.print("calling Py_Initialize()...\n", .{});
    python.Py_Initialize();
    std.debug.print("success!\n", .{});
    globals = python.PyDict_New();
}

pub fn exec(s: [*:0]const u8) !void {
    // std.debug.print("exec '{s}'\n", .{s});
    // Returns 0 on success or -1 if an exception was raised. If there was an error, there is no way to get the exception information.
    var pstr = python.PyRun_String(s, python.Py_single_input, globals, globals);
    if (pstr == null) {
        python.PyErr_Clear();
        // failed - some sort of exception got raised.
        std.debug.print("failed to run '{s}'\n", .{s});
        return General.RuntimeError;
    }
    // it worked.  We don't use the return value for anything.
    python.Py_DECREF(pstr);
}

pub fn eval(allocator: std.mem.Allocator, s: [*:0]const u8) ![]u8 {
    // std.debug.print("eval '{s}'\n", .{s});
    var pstr = python.PyRun_String(s, python.Py_eval_input, globals, globals);
    if (pstr == null) {
        python.PyErr_Clear();
        std.debug.print("eval -- PyRun_String failed\n", .{});
        return General.RuntimeError;
    }
    defer python.Py_DECREF(pstr);

    var rep = python.PyObject_Repr(pstr);
    if (rep == null) {
        python.PyErr_Clear();
        std.debug.print("eval -- PyObject_Repr failed\n", .{});
        return General.RuntimeError;
    }
    defer python.Py_DECREF(rep);
    // std.debug.print("rep ptr = {*}\n", .{rep});
    const str_rep = python.PyUnicode_AsUTF8(rep);

    // std.debug.print("str_rep = {s}\n", .{str_rep});
    return try std.fmt.allocPrint(
        allocator,
        "{s}",
        .{str_rep},
    );
}

// var importedJson = false;
// var json: *python.PyObject = undefined;
// pub fn toJSON(allocator: std.mem.Allocator, s: [*:0]const u8) ![]u8 {
//     // Import the JSON module
//     if (!importedJson) {
//         json = python.PyImport_ImportModule("json");
//         if (json == null) {
//             python.PyErr_Clear();
//             std.debug.print("toJSON -- failed to import json module\n", .{});
//             return General.RuntimeError;
//         }
//         importedJson = true;
//     }
//     // Evaluate s:
//     var pstr = python.PyRun_String(s, python.Py_eval_input, globals, globals);
//     if (pstr == null) {
//         python.PyErr_Clear();
//         std.debug.print("toJSON -- PyRun_String failed\n", .{});
//         return General.RuntimeError;
//     }
//     defer python.Py_DECREF(pstr);

//     // Convert to JSON

// }

const eql = std.mem.eql;
const expect = std.testing.expect;
const test_allocator = std.testing.allocator;

test "exec" {
    init();
    try exec("print('hello')");
}

test "eval" {
    const a = try eval(test_allocator, "sum(range(101))");
    defer test_allocator.free(a);
    try expect(eql(u8, a, "5050"));
}

test "exec and eval" {
    try exec("w = 10; v = range(101)");
    const a = try eval(test_allocator, "sum(v)");
    defer test_allocator.free(a);
    try expect(eql(u8, a, "5050"));
    const b = try eval(test_allocator, "w+1");
    defer test_allocator.free(b);
    try expect(eql(u8, b, "11"));
}

// pub fn add() void {
//     init();
//     _ = python.PyRun_SimpleString("print('1 + ... + 100 = ', sum(range(101)))\n");
// }

// test "do something" {
//     _ = add();
//     python.Py_FinalizeEx();
// }
