const std = @import("std");
const python = @cImport(@cInclude("Python.h"));
const PyObject = python.PyObject;
pub const General = error{ OverflowError, RuntimeError };

var didInit = false;
var globals: *PyObject = undefined;
var libpythonHandle: ?*anyopaque = null; // not initialized

// Call any 0 argument function in the Python C api.  You have to give the name and
// type of the function.
fn PyAPI0(name: [*:0]const u8, comptime T: type) @typeInfo(T).Fn.return_type.? {
    //std.debug.print("T = {}\n", .{@typeInfo(T).Fn});
    return @ptrCast(T, std.c.dlsym(libpythonHandle, name))();
}

fn PyAPI1(name: [*:0]const u8, comptime T: type, arg0: @typeInfo(T).Fn.args[0].arg_type.?) @typeInfo(T).Fn.return_type.? {
    //std.debug.print("T = {}\n", .{@typeInfo(T).Fn});
    return @ptrCast(T, std.c.dlsym(libpythonHandle, name))(arg0);
}
fn PyAPI2(name: [*:0]const u8, comptime T: type, arg0: @typeInfo(T).Fn.args[0].arg_type.?, arg1: @typeInfo(T).Fn.args[1].arg_type.?) @typeInfo(T).Fn.return_type.? {
    //std.debug.print("T = {}\n", .{@typeInfo(T).Fn});
    return @ptrCast(T, std.c.dlsym(libpythonHandle, name))(arg0, arg1);
}
fn PyAPI3(name: [*:0]const u8, comptime T: type, arg0: @typeInfo(T).Fn.args[0].arg_type.?, arg1: @typeInfo(T).Fn.args[1].arg_type.?, arg2: @typeInfo(T).Fn.args[2].arg_type.?) @typeInfo(T).Fn.return_type.? {
    //std.debug.print("T = {}\n", .{@typeInfo(T).Fn});
    return @ptrCast(T, std.c.dlsym(libpythonHandle, name))(arg0, arg1, arg2);
}

fn PyAPI4(name: [*:0]const u8, comptime T: type, arg0: @typeInfo(T).Fn.args[0].arg_type.?, arg1: @typeInfo(T).Fn.args[1].arg_type.?, arg2: @typeInfo(T).Fn.args[2].arg_type.?, arg3: @typeInfo(T).Fn.args[3].arg_type.?) @typeInfo(T).Fn.return_type.? {
    //std.debug.print("T = {}\n", .{@typeInfo(T).Fn});
    return @ptrCast(T, std.c.dlsym(libpythonHandle, name))(arg0, arg1, arg2, arg3);
}

pub fn init() void {
    if (didInit) return;
    didInit = true;
    std.debug.print("calling dlopen...\n", .{});
    libpythonHandle = std.c.dlopen("/Users/wstein/build/cocalc/src/data/projects/2c9318d1-4f8b-4910-8da7-68a965514c95/python-wasm/packages/dylink/dist/wasm/libpython.so", 2);
    std.debug.print("got libpythonHandle={d}...\n", .{libpythonHandle});
    std.debug.print("calling Py_Initialize()...\n", .{});
    PyAPI0("Py_Initialize", fn () void);
    std.debug.print("success!\n", .{});
    globals = PyAPI0("PyDict_New", fn () *PyObject);
    std.debug.print("got globals at {*}\n", .{globals});
}

// If there was an error, there is no way to get the exception information *yet*.
pub fn exec(s: [*:0]const u8) !void {
    init();
    std.debug.print("exec '{s}'\n", .{s});
    var pstr = PyAPI4("PyRun_String", fn ([*:0]const u8, i32, *PyObject, *PyObject) ?*PyObject, s, python.Py_file_input, globals, globals);
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
    init();
    // std.debug.print("eval '{s}'\n", .{s});
    var pstr0 = PyAPI4("PyRun_String", fn ([*:0]const u8, i32, *PyObject, *PyObject) ?*PyObject, s, python.Py_eval_input, globals, globals);
    var pstr = pstr0 orelse {
        PyAPI0("PyErr_Clear", fn () void);
        std.debug.print("eval -- PyRun_String failed\n", .{});
        return General.RuntimeError;
    };
    defer PyAPI1("Py_DECREF", fn (*PyObject) void, pstr);

    var rep0 = PyAPI1("PyObject_Repr", fn (*PyObject) ?*PyObject, pstr);
    var rep = rep0 orelse {
        PyAPI0("PyErr_Clear", fn () void);
        std.debug.print("eval -- PyObject_Repr failed\n", .{});
        return General.RuntimeError;
    };
    defer PyAPI1("Py_DECREF", fn (*PyObject) void, rep);
    // std.debug.print("rep ptr = {*}\n", .{rep});
    const str_rep = PyAPI1("PyUnicode_AsUTF8", fn (*PyObject) [*:0]const u8, rep);

    // std.debug.print("str_rep = {s}\n", .{str_rep});
    return try std.fmt.allocPrint(
        allocator,
        "{s}",
        .{str_rep},
    );
}

pub fn terminal(argc: i32, argv: [*c][*c]u8) i32 {
    // std.debug.print("calling Py_BytesMain()... with argc={}, argv[0]={s} argv[1]={s} inputs\n", .{argc, argv[0], argv[1]});
    // std.debug.print("calling Py_BytesMain()... with argc={}, argv[0]={s}\n", .{argc, argv[0]});
    const r = PyAPI2("Py_BytesMain", fn (i32, [*c][*c]u8) i32, argc, argv);
    // std.debug.print("Py_Main exited with code {}\n", .{r});
    return r;
}

test "init" {
    init();
}
