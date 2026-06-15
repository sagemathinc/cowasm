#include "Python.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

extern void wasmSendString(const char *ptr, size_t len);
extern void wasmSetException(void);

static int didInit = 0;
static PyObject *globals = NULL;

__attribute__((visibility("default")))
void
keepalive(void)
{
}

__attribute__((visibility("default")))
void *
c_malloc(size_t n)
{
    return malloc(n);
}

__attribute__((visibility("default")))
void
c_free(void *ptr)
{
    free(ptr);
}

__attribute__((visibility("default")))
int
cowasm_python_init(void)
{
    if (didInit) {
        return 0;
    }

    Py_Initialize();
    if (PyRun_SimpleString(
            "try:\n"
            "    import cowasm_importer\n"
            "    cowasm_importer.init()\n"
            "except ModuleNotFoundError as err:\n"
            "    if err.name != 'cowasm_importer':\n"
            "        raise\n") != 0) {
        return 1;
    }

    globals = PyDict_New();
    if (globals == NULL) {
        return 1;
    }

    didInit = 1;
    return 0;
}

static int
assert_init(void)
{
    if (!didInit) {
        fprintf(stderr, "call init() first\n");
        return 1;
    }
    return 0;
}

__attribute__((visibility("default")))
int
cowasm_python_repr(const char *s)
{
    if (assert_init() != 0) {
        wasmSetException();
        return 1;
    }

    PyObject *value = PyRun_String(s, Py_eval_input, globals, globals);
    if (value == NULL) {
        PyErr_Clear();
        wasmSetException();
        return 1;
    }

    PyObject *repr = PyObject_Repr(value);
    Py_DECREF(value);
    if (repr == NULL) {
        PyErr_Clear();
        wasmSetException();
        return 1;
    }

    const char *text = PyUnicode_AsUTF8(repr);
    if (text == NULL) {
        Py_DECREF(repr);
        PyErr_Clear();
        wasmSetException();
        return 1;
    }

    wasmSendString(text, strlen(text));
    Py_DECREF(repr);
    return 0;
}

__attribute__((visibility("default")))
int
cowasm_python_exec(const char *s)
{
    if (assert_init() != 0) {
        wasmSetException();
        return 1;
    }

    PyObject *value = PyRun_String(s, Py_file_input, globals, globals);
    if (value == NULL) {
        PyErr_Clear();
        wasmSetException();
        return 1;
    }

    Py_DECREF(value);
    return 0;
}

__attribute__((visibility("default")))
int
cowasm_python_terminal(int argc, char **argv)
{
    return Py_BytesMain(argc, argv);
}
