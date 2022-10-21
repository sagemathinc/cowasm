const std = @import("std");
const py = @cImport(@cInclude("Python.h"));

var gpa = std.heap.GeneralPurposeAllocator(.{}){};
var allocator = gpa.allocator();

pub const General = error{RuntimeError};
const PyObject = py.PyObject;

var didInit = false;
var globals: *PyObject = undefined;
export fn cowasm_python_init() c_int {
    if (didInit) return 0;
    // std.debug.print("python.init()...\n", .{});
    py.Py_Initialize();
    // std.debug.print("success!\n", .{});
    globals = py.PyDict_New() orelse {
        return 1;
    };
    // Success!
    didInit = true;
    return 0;
}

pub fn assertInit() !void {
    if (!didInit) {
        std.debug.print("call init() first\n", .{});
        return General.RuntimeError;
    }
}


/////////////////////////////////
//
// Implementation of eval
//
/////////////////////////////////

extern fn wasmSendString(ptr: [*]const u8, len: usize) void;

export fn cowasm_python_repr(s: [*:0]const u8) void {
    const r = repr(s) catch |err| {
        //todo
        std.debug.print("python error: '{}'\nwhen evaluating '{s}'", .{ err, s });
        return;
    };
    defer allocator.free(r);
    // Todo: this r[0..1] is a casting hack -- I think it's harmless
    // because r itself is null terminated (?).
    const ptr: [*]const u8 = r[0..1];
    wasmSendString(ptr, std.mem.len(r));
}

fn repr(s: [*:0]const u8) ![]u8 {
    try assertInit();
    // std.debug.print("eval '{s}'\n", .{s});

    var pstr = py.PyRun_String(s, py.Py_eval_input, globals, globals) orelse {
        py.PyErr_Clear();
        std.debug.print("eval -- PyRun_String failed\n", .{});
        return General.RuntimeError;
    };
    defer py.Py_DECREF(pstr);

    var rep = py.PyObject_Repr(pstr) orelse {
        py.PyErr_Clear();
        std.debug.print("eval -- PyObject_Repr failed\n", .{});
        return General.RuntimeError;
    };
    defer py.Py_DECREF(rep);
    // std.debug.print("rep ptr = {*}\n", .{rep});
    const str_rep = py.PyUnicode_AsUTF8(rep);

    // std.debug.print("str_rep = {s}\n", .{str_rep});
    return try std.fmt.allocPrint(
        allocator,
        "{s}",
        .{str_rep},
    );
}
