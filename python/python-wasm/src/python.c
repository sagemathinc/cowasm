#include <Python.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

extern void wasmSendString(const char *ptr, size_t len);
extern void wasmSetException(void);
extern int wasmGetSignalState(void);

__attribute__((visibility("default"))) void __SIG_ERR(int signum) {
  (void)signum;
}

__attribute__((visibility("default"))) void __SIG_IGN(int signum) {
  (void)signum;
}

__attribute__((visibility("default"))) void keepalive(void) {}

__attribute__((visibility("default"))) void *c_malloc(size_t n) {
  return malloc(n);
}

__attribute__((visibility("default"))) void c_free(void *ptr) { free(ptr); }

static int did_init = 0;
static PyObject *globals = NULL;

__attribute__((visibility("default"))) int cowasm_python_init(void) {
  if (did_init) {
    return 0;
  }
  Py_Initialize();
  if (PyRun_SimpleString("try:\n"
                         "    import cowasm_importer\n"
                         "    cowasm_importer.init()\n"
                         "except ModuleNotFoundError as err:\n"
                         "    if err.name != \"cowasm_importer\":\n"
                         "        raise\n") != 0) {
    return 1;
  }
  globals = PyDict_New();
  if (globals == NULL) {
    return 1;
  }
  did_init = 1;
  return 0;
}

static int assert_init(void) {
  if (!did_init) {
    fprintf(stderr, "call init() first\n");
    return 1;
  }
  return 0;
}

__attribute__((visibility("default"))) int
cowasm_python_repr(const char *source) {
  if (assert_init()) {
    wasmSetException();
    return 1;
  }
  PyObject *value = PyRun_String(source, Py_eval_input, globals, globals);
  if (value == NULL) {
    PyErr_Clear();
    fprintf(stderr, "eval -- PyRun_String failed\n");
    wasmSetException();
    return 1;
  }
  PyObject *repr = PyObject_Repr(value);
  Py_DECREF(value);
  if (repr == NULL) {
    PyErr_Clear();
    fprintf(stderr, "eval -- PyObject_Repr failed\n");
    wasmSetException();
    return 1;
  }
  const char *text = PyUnicode_AsUTF8(repr);
  if (text == NULL) {
    PyErr_Clear();
    Py_DECREF(repr);
    wasmSetException();
    return 1;
  }
  wasmSendString(text, strlen(text));
  Py_DECREF(repr);
  return 0;
}

__attribute__((visibility("default"))) int
cowasm_python_exec(const char *source) {
  if (assert_init()) {
    wasmSetException();
    return 1;
  }
  PyObject *result = PyRun_String(source, Py_file_input, globals, globals);
  if (result == NULL) {
    PyErr_Clear();
    fprintf(stderr, "failed to run '%s'\n", source);
    wasmSetException();
    return 1;
  }
  Py_DECREF(result);
  return 0;
}

__attribute__((visibility("default"))) int
cowasm_python_terminal(int argc, char **argv) {
  return Py_BytesMain(argc, argv);
}

__attribute__((visibility("default"))) void _Py_CheckEmscriptenSignals(void) {
  int signal = wasmGetSignalState();
  if (signal != 0 && PyErr_SetInterruptEx(signal) != 0) {
    fprintf(stderr,
            "_Py_CheckEmscriptenSignals: ERROR -- invalid signal = %d\n",
            signal);
  }
}

__attribute__((visibility("default"))) void
_Py_CheckEmscriptenSignalsPeriodically(void) {
  _Py_CheckEmscriptenSignals();
}
