// We make a WASM extension to cpython with the code written in zig here
// and in hellozigmodule.c.

// We can implement the functions in zig, but we have to do the
// basic wiring in C still (in hellomodule.c), since Python extension
// modules involve a bunch of macros that zig can't parse.  And we
// shouldn't just read the code and try to untagle them, since that violates
// the abstraction.  The best thing is to have a C layer.

const std = @import("std");
const py = @cImport(@cInclude("Python.h"));

export fn hello(self: *py.PyObject, args: *py.PyObject) ?*py.PyObject {
    _ = self;
    var name: [*:0]u8 = undefined;
    if (py.PyArg_ParseTuple(args, "s", &name) == 0) {
        return null;
    }
    std.debug.print("Hello {s}, from Zig!\n", .{name});
    return py.Py_NewRef(py.Py_None);
}

export fn add389(self: *py.PyObject, args: *py.PyObject) ?*py.PyObject {
    _ = self;
    var n: c_long = undefined;
    if (py.PyArg_ParseTuple(args, "l", &n) == 0) {
        return null;
    }
    return py.PyLong_FromLong(n + 389);
}

export fn gcd_impl(self: *py.PyObject, args: *py.PyObject) ?*py.PyObject {
    _ = self;
    var n: c_long = undefined;
    var m: c_long = undefined;
    if (py.PyArg_ParseTuple(args, "ll", &n, &m) == 0) {
        return null;
    }
    return py.PyLong_FromLong(gcd(n, m));
}

fn gcd(a: c_long, b: c_long) c_long {
    var c: c_long = undefined;
    var a0 = a;
    var b0 = b;
    while (b0 != 0) {
        c = @mod(a0, b0);
        a0 = b0;
        b0 = c;
    }
    return a0;
}
