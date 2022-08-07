const std = @import("std");
const python = @cImport(@cInclude("Python.h"));

var libpythonHandle: ?*anyopaque = null;

// IMPORTANT -- general note -- do NOT use macros directly from python.[tab]!
// Why? Because they can try to link in and use a local copy of something, which will lead to a subtle bug.

pub const PyObject = python.PyObject;
pub const Py_file_input = python.Py_file_input;
pub const Py_eval_input = python.Py_eval_input;

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

pub fn Py_Initialize() void {
    PyAPI0("Py_Initialize", @TypeOf(Py_Initialize));
}

pub fn PyDict_New() *PyObject {
    return PyAPI0("PyDict_New", @TypeOf(PyDict_New));
}

pub fn PyRun_String(str: [*:0]const u8, start: i32, globals0: *PyObject, locals: *PyObject) ?*PyObject {
    return PyAPI4("PyRun_String", @TypeOf(PyRun_String), str, start, globals0, locals);
}

pub fn PyObject_Repr(pstr: *PyObject) ?*PyObject {
    return PyAPI1("PyObject_Repr", @TypeOf(PyObject_Repr), pstr);
}

pub fn Py_DECREF(obj: *PyObject) void {
    PyAPI1("Py_DECREF", @TypeOf(Py_DECREF), obj);
}

pub fn PyErr_Clear() void {
    PyAPI0("PyErr_Clear", @TypeOf(PyErr_Clear));
}

pub fn PyUnicode_AsUTF8(rep: *PyObject) [*:0]const u8 {
    return PyAPI1("PyUnicode_AsUTF8", @TypeOf(PyUnicode_AsUTF8), rep);
}

pub fn Py_BytesMain(argc: i32, argv: [*c][*c]u8) i32 {
    return PyAPI2("Py_BytesMain", @TypeOf(Py_BytesMain), argc, argv);
}

pub fn init(libpython_so : [*:0]const u8) !void {
    // std.debug.print("calling dlopen...\n", .{});
    libpythonHandle = std.c.dlopen(libpython_so, 2);
    // std.debug.print("got libpythonHandle={d}...\n", .{libpythonHandle});
    // std.debug.print("calling Py_Initialize()  {}...\n", .{python.Py_Initialize});
    if (libpythonHandle == null) {
        return error{RuntimeError}.RuntimeError;
    }
}
