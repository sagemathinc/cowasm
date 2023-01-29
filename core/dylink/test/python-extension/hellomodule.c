#include "app.h"
#include <stdio.h>
#include <math.h>
#include <time.h>
#include <assert.h>

extern float mysin(float n);

static PyObject *hello(PyObject *self, PyObject *args) {
  float s = 0;
  printf("start hello...\n");
  printf(
      "If this takes more than a second, then the function pointer mechanism "
      "is broken:\n");
  time_t start, end;
  time(&start);
  // ((int)self) % n is just to keep this from getting compiled out:
  for (int i = 0; i < 1000000 + ((int)self) % 1000; i++) {
    s += mysin(i);
  }
  time(&end);
  printf("done hello... s=%f\n", s);
  printf("time = %ld seconds\n",
         end - start);  // this is in *seconds*, so basicaly going to be 0
  assert(end - start <= 1);
  // printf("python-wasm: 'hello there ** FROM HELLO!'\n");
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