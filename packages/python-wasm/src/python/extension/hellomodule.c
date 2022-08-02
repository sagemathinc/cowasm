#include <Python.h>

static PyObject *hello(PyObject *self, PyObject *args) {
  const char *name;
  if (!PyArg_ParseTuple(args, "s", &name)) {
    return NULL;
  }
  printf("python-wasm: 'hello %s!'\n", name);
  Py_RETURN_NONE;
}

static PyObject *add389(PyObject *self, PyObject *args) {
  const long n;
  if (!PyArg_ParseTuple(args, "l", &n)) {
    return NULL;
  }
  return PyLong_FromLong(n + 389);
}

static PyMethodDef module_methods[] = {
    {"hello", _PyCFunction_CAST(hello), METH_VARARGS, "Say hello to you."},
    {"add389", _PyCFunction_CAST(add389), METH_VARARGS, "Add 389 to a C long."},
    {NULL, NULL, 0, NULL}};

struct PyModuleDef _hellomodule = {
    .m_base = PyModuleDef_HEAD_INIT,
    .m_name = "hello",
    .m_methods = module_methods,
};

PyMODINIT_FUNC PyInit_hello(void) {
  printf("PyInit_hello\n");
  // initialize the module:
  return PyModuleDef_Init(&_hellomodule);
}