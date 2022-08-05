#include <math.h>
#include <stdio.h>
#include <assert.h>
#include "app.h"

extern void* dlopen(const char* filename, int flags);
extern void* dlsym(void* handle, const char* symbol);

#ifndef WASM_EXPORT
#define WASM_EXPORT(x) __attribute__((visibility("default"))) void* __WASM_EXPORT__##x() { return &(x);}
#endif

EXPORTED_SYMBOL
PyObject _Py_NoneStruct = {.thingy = 1};

WASM_EXPORT(_Py_NoneStruct)

const __stack_chk_guard = 0;
WASM_EXPORT(__stack_chk_guard)

EXPORTED_SYMBOL
float mysin(float n) { return sin(n + 1); }

// If you comment this out, then no function pointer to mysin is generated,
// and the call to hello will be insanely slow.
WASM_EXPORT(mysin)

EXPORTED_SYMBOL
int PyModuleDef_Init(struct PyModuleDef* module) {
  printf("PyModuleDef_Init, module = %p \n", module);

  PyCFunction f = (module->m_methods)[0].f;
  printf("PyModuleDef_Init, hello = %p \n", f);
  return (*f)(NULL, NULL);
}

typedef int (*INIT_FUNCTION)();

int main() {
  printf("Running Tests...\n");
  void* handle = dlopen("./hello.so", 2);
  printf("Got handle=%p\n", handle);
  assert(handle != NULL);
  // Fetch a pointer to the init function:
  INIT_FUNCTION init = (INIT_FUNCTION)dlsym(handle, "PyInit_hello");
  assert(init != NULL);
  printf("Got init=%p\n", init);
  printf("PyInit_hello() = %d\n", (*init)());
  printf("All tests passed!\n");
}
