const std = @import("std");
const py = @cImport(@cInclude("Python.h"));
const signal = @import("./signal.zig");

export fn keepalive() void {
    signal.keepalive();
}

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
// Implementation of repr
//
/////////////////////////////////

extern fn wasmSendString(ptr: [*]const u8, len: usize) void;

// TODO: would like to say what the exception actually is. For now, at least inform
// that it happened.
extern fn wasmSetException() void;

export fn cowasm_python_repr(s: [*:0]const u8) i32 {
    const r = repr(s) catch |err| {
        //todo
        wasmSetException();
        std.debug.print("python error: '{}'\nwhen evaluating '{s}'", .{ err, s });
        return 1;
    };
    defer allocator.free(r);
    // Todo: this r[0..1] is a casting hack -- I think it's harmless
    // because r itself is null terminated (?).
    const ptr: [*]const u8 = r[0..1];
    wasmSendString(ptr, std.mem.len(r));
    return 0;
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

/////////////////////////////////
//
// Implementation of exec
//
/////////////////////////////////

// TODO: If there was an error, there is no way to get the exception information *yet*.
fn exec(s: [*:0]const u8) !void {
    try assertInit();
    // std.debug.print("exec '{s}'\n", .{s});
    var pstr = py.PyRun_String(s, py.Py_file_input, globals, globals) orelse {
        py.PyErr_Clear();
        // failed - some sort of exception got raised.
        std.debug.print("failed to run '{s}'\n", .{s});
        return General.RuntimeError;
    };
    // it worked.  We don't use the return value for anything.
    py.Py_DECREF(pstr);
}

export fn cowasm_python_exec(s: [*:0]const u8) i32 {
    exec(s) catch |err| {
        //todo
        wasmSetException();
        std.debug.print("python error: '{}'\nwhen evaluating '{s}'", .{ err, s });
        return 1;
    };
    return 0;
}

/////////////////////////////////
//
// Implementation of terminal = running the main function
//
/////////////////////////////////

export fn cowasm_python_terminal(argc: i32, argv: [*c][*c]u8) i32 {
    assertInit() catch |err| {
        std.debug.print("terminal: must first init python -- {}", .{err});
        return 1;
    };
    // std.debug.print("calling Py_BytesMain()... with argc={}, argv[0]={s} argv[1]={s} inputs\n", .{ argc, argv[0], argv[1] });
    const r = py.Py_BytesMain(argc, argv);
    // std.debug.print("Py_BytesMain finished returning r={}\n", .{r});
    return r;
}
