#include "app.h"
#include <stdio.h>
#include <stdlib.h>

extern int vecsum(int *v, int n);

static PyObject *hello(PyObject *self, PyObject *args) {
  printf("hello...\n");
  printf("allocate some memory...\n");
  int n = 101;
  int *a = malloc(sizeof(int) * n);
  printf("got memory at a=%p\n", a);
  for (int i = 0; i < n; i++) {
    a[i] = i;
  }
  printf("sum is %d\n", vecsum(a, n));
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
  return PyModuleDef_Init(&_hellomodule);
}