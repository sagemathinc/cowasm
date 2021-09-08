#include <Python.h>
#include <emscripten.h>
#include <stdio.h>

// Stubs
int signal(int s, void (*func)(void)) { return 0; }
int siginterrupt(int s, int t) { return 0; }
int sigaction(int s, int t, int r) { return 0; }
int __libc_current_sigrtmin() { return 0; }
int __libc_current_sigrtmax() { return 0; }

PyObject *py_main, *globals, *locals;

const int MAX_OBJECTS = 10000;
PyObject** objects;
int objects_n = 0;
int setObject(PyObject* obj) {
  if (objects_n >= MAX_OBJECTS) {
    return -1;
  }
  objects[objects_n] = obj;
  return objects_n++;
}

PyObject* getObject(int n) {
  if (n < 0 || n >= MAX_OBJECTS) {
    printf("ERROR: getObject invalid input n=%d!\n", n);
  }
  return objects[n];
}

EMSCRIPTEN_KEEPALIVE
void free_object(int n) { Py_XDECREF(objects[n]); }

static void reprint(PyObject* obj) {
  printf("reprint %d\n", (int)obj);
  PyObject* repr = PyObject_Repr(obj);
  PyObject* str = PyUnicode_AsEncodedString(repr, "utf-8", "~E~");
  const char* bytes = PyBytes_AS_STRING(str);

  printf("REPR: %s\n", bytes);

  Py_XDECREF(repr);
  Py_XDECREF(str);
}

EMSCRIPTEN_KEEPALIVE
void init() {
  Py_Initialize();
  py_main = PyImport_AddModule("__main__");
  globals = PyModule_GetDict(py_main);
  locals = PyDict_New();
  objects = (PyObject**)malloc(sizeof(PyObject*) * MAX_OBJECTS);
}

EMSCRIPTEN_KEEPALIVE
void py_run(char* s) {
  // printf("py_run %s\n", s);
  PyRun_SimpleString(s);
}

EMSCRIPTEN_KEEPALIVE
int py_eval(char* s) {
  // printf("py_eval %s\n", s);
  PyObject* obj = PyRun_String(s, Py_eval_input, globals, locals);
  return setObject(obj);
}

PyObject* tmpString = 0;
EMSCRIPTEN_KEEPALIVE
void py_tmp_string_free() {
  // Free temporary string.
  Py_XDECREF(tmpString);
}

EMSCRIPTEN_KEEPALIVE
const char* py_repr(int n) {
  PyObject* obj = getObject(n);
  PyObject* repr = PyObject_Repr(obj);
  tmpString = PyUnicode_AsEncodedString(repr, "utf-8", "~E~");
  const char* bytes = PyBytes_AS_STRING(tmpString);
  Py_XDECREF(repr);
  // tmpString gets immediately XDECREF'd by the function that
  // calls py_repr.
  return bytes;
}

EMSCRIPTEN_KEEPALIVE
const char* py_str(int n) {
  PyObject* obj = getObject(n);
  PyObject* str = PyObject_Str(obj);
  tmpString = PyUnicode_AsEncodedString(str, "utf-8", "~E~");
  const char* bytes = PyBytes_AS_STRING(tmpString);
  printf("bytes='%s'\n", bytes);
  Py_XDECREF(str);
  // tmpString gets immediately XDECREF'd by the function that
  // calls py_repr.
  return bytes;
}

EMSCRIPTEN_KEEPALIVE
int py_mul(int obj1, int obj2) {
  PyObject* obj = PyNumber_Multiply(getObject(obj1), getObject(obj2));
  return setObject(obj);
}

EMSCRIPTEN_KEEPALIVE void finalize() { Py_FinalizeEx(); }
