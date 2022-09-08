const std = @import("std");
const py = @cImport(@cInclude("Python.h"));
const unistd = @cImport(@cInclude("unistd.h"));

pub const General = error{ OverflowError, RuntimeError };
const PyObject = py.PyObject;

var didInit = false;
var globals: *PyObject = undefined;
pub fn init(cwd: [*:0]const u8) !void {
    if (didInit) return;

    // try py.init(libpython_so);
    // std.debug.print("calling Py_Initialize()...\n", .{});

    if (unistd.chdir(cwd) == -1) {
        // We must set the current working directory, since WASI doesn't.
        // The zig library docs even incorrectly claim there is no concept of working directory
        // (TODO: upstream bug report) here https://ziglang.org/documentation/master/std/#root;fs.Dir.setAsCwd
        std.debug.print("WARNING: failed to set current directory to '{s}' \n", .{cwd});
        return General.RuntimeError;
    }
    py.Py_Initialize();
    // std.debug.print("success!\n", .{});
    globals = py.PyDict_New() orelse {
        return General.RuntimeError;
    };

    // Success!
    didInit = true;
}

// This is basically a translation from C to Zig of
//
//    https://docs.python.org/3.11/c-api/init_config.html#c.PyConfig
//
// Call this before init above so that python knows the correct value for
//
//    "import sys; sys.executable"
//
// Otherwise, it is '', which may be fine in some contexts (e.g., in browser without fork).
// This mainly matter when using fork, e.g., installing packages on the command line.
pub fn initProgramName(program_name: [*:0]const u8) !void {
    var config: py.PyConfig = undefined;
    py.PyConfig_InitPythonConfig(&config);
    defer py.PyConfig_Clear(&config);

    //  Set the program name. Implicitly preinitialize Python.
    var status = py.PyConfig_SetBytesString(&config, &config.program_name, program_name);
    if (py.PyStatus_Exception(status) != 0) {
        std.debug.print("ERROR: failed to set config.program_name\n", .{});
        return General.RuntimeError;
    }

    status = py.Py_InitializeFromConfig(&config);
    if (py.PyStatus_Exception(status) != 0) {
        std.debug.print("ERROR: failed to initialize python from configuration when setting program name\n", .{});
        return General.RuntimeError;
    }
}

pub fn assertInit() !void {
    if (!didInit) {
        std.debug.print("call init() first\n", .{});
        return General.RuntimeError;
    }
}

// If there was an error, there is no way to get the exception information *yet*.
pub fn exec(s: [*:0]const u8) !void {
    try assertInit();
    std.debug.print("exec '{s}'\n", .{s});
    var pstr = py.PyRun_String(s, py.Py_file_input, globals, globals) orelse {
        py.PyErr_Clear();
        // failed - some sort of exception got raised.
        std.debug.print("failed to run '{s}'\n", .{s});
        return General.RuntimeError;
    };
    // it worked.  We don't use the return value for anything.
    py.Py_DECREF(pstr);
}

pub fn eval(allocator: std.mem.Allocator, s: [*:0]const u8) ![]u8 {
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

pub fn terminal(argc: i32, argv: [*c][*c]u8) !i32 {
    try assertInit();
    // std.debug.print("calling Py_BytesMain()... with argc={}, argv[0]={s} argv[1]={s} inputs\n", .{argc, argv[0], argv[1]});
    // std.debug.print("calling Py_BytesMain()... with argc={}, argv[0]={s}\n", .{argc, argv[0]});
    const r = py.Py_BytesMain(argc, argv);
    // std.debug.print("Py_Main exited with code {}\n", .{r});
    return r;
}

// TODO: Zig unit testing requires writing a js command line loader that supports shared libraries properly.
// Also we need to specify the path to libpython.so somehow...

// test "init" {
//     try init();
// }

// const eql = std.mem.eql;
// const expect = std.testing.expect;
// const test_allocator = std.testing.allocator;

// test "exec" {
//     try init();
//     try exec("a = 2 + 3");
//     const a = try eval(test_allocator, "a");
//     defer test_allocator.free(a);
//     try expect(eql(u8, a, "5"));
// }

// test "exec of longer multi-statement code" {
//     try init();
//     try exec("def f(n):\n    return n*2\n\na=f(1010)");
//     const a = try eval(test_allocator, "a");
//     defer test_allocator.free(a);
//     try expect(eql(u8, a, "2020"));
// }

// test "eval" {
//     try init();
//     const a = try eval(test_allocator, "sum(range(101))");
//     defer test_allocator.free(a);
//     try expect(eql(u8, a, "5050"));
// }

// test "exec and eval" {
//     try init();
//     try exec("w = 10; v = range(101)");
//     const a = try eval(test_allocator, "sum(v)");
//     defer test_allocator.free(a);
//     try expect(eql(u8, a, "5050"));
//     const b = try eval(test_allocator, "w+1");
//     defer test_allocator.free(b);
//     try expect(eql(u8, b, "11"));
// }

