#include "app.h"
 #include <stdio.h>

static PyObject *hello(PyObject *self, PyObject *args) {
  printf("python-wasm: 'hello there'\n");
  return PyNone;
}

static struct PyMethodDef module_methods[] = {{"hello", hello}, {NULL, NULL}};

static struct PyModuleDef _hellomodule = {
    .m_name = "hello",
    .m_methods = module_methods,
};

EXPORTED_SYMBOL int PyInit_hello(void) {
  printf("PyInit_hello\n");
  // initialize the module:
  return PyModuleDef_Init(&_hellomodule);
}