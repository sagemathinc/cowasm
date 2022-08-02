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

// This is super fast!
// static PyObject *hello2(PyObject *self, PyObject *args) {
//   float s = 0;
//   printf("start hello2...\n");
//   FUN_PTR f = get_mysin();
//   for (int i = 0; i < 500000; i++) {
//     s += (*f)(i);
//   }
//   printf("done hello2... s=%f\n", s);
//   return PyNone;
// }

// This is also super fast!
// static PyObject *hello3(PyObject *self, PyObject *args) {
//   float s = 0;
//   printf("start hello3...\n");
//   for (int i = 0; i < 500000; i++) {
//     s += sin(i);
//   }
//   printf("done hello3... s=%f\n", s);
//   return PyNone;
// }

static struct PyMethodDef module_methods[] = {
    {"hello", &hello},
    /*{"hello2", &hello2}, {"hello3", &hello3},*/ {NULL, NULL}};

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