#include "app.h"
#include <stdio.h>

static PyObject *hello(PyObject *self, PyObject *args) {
  printf("python-wasm: 'hello there ** FROM HELLO!'\n");
  return PyNone;
}

static struct PyMethodDef module_methods[] = {{"hello", &hello}, {NULL, NULL}};

struct PyModuleDef _hellomodule = {
    .m_name = "hello",
    .m_methods = module_methods,
};

EXPORTED_SYMBOL int PyInit_hello(void) {
  printf("PyInit_hello\n");
  // initialize the module:
  printf("the hello function is at %p\n", &hello);
  (*(&hello))(0,0);
  return PyModuleDef_Init(&_hellomodule);
}