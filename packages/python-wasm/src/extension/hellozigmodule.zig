// This is a work in progress!

const std = @import("std");
const py = @cImport(@cInclude("Python.h"));

fn hello(self: *py.PyObject, args: *py.PyObject) *py.PyObject {
    _ = self;
    var name: *u8 = undefined;
    if (py.PyArg_ParseTuple(args, "s", &name) != 0) {
        return null;
    }
}

var module_methods = [2]py.PyMethodDef{
    py.PyMethodDef{
        .ml_name = "hello",
        .ml_meth = py._PyCFunction_CAST(hello),
        .ml_flags = @as(c_int, 1),
        .ml_doc = "Say hello to you.",
    },
    py.PyMethodDef{
        .ml_name = null,
        .ml_meth = null,
        .ml_flags = @as(c_int, 0),
        .ml_doc = null,
    },
};

fn module_clear(module: *py.PyObject) c_int {
    _ = module;
    return 0;
}

// fn module_free(module: *py.PyObject) void {
//     module_clear(module);
// }

var PyObject_HEAD_INIT = .{ 1, py._Py_NULL, py._Py_NULL, 0, py._Py_NULL };

var hellozigmodule = py.PyModuleDef{ .m_base = PyObject_HEAD_INIT, .m_name = "hellozig", .m_methods = module_methods, .m_clear = module_clear };

export fn PyInit_hello() *py.PyObject {
    std.debug.print("PyInit_hello\n", .{});
    return py.PyModuleDef_Init(&hellozigmodule);
}
