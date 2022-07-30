#include "app.h"

extern void* dlopen(const char* filename, int flags);
void* dlsym(void* handle, const char* symbol);

EXPORTED_SYMBOL
PyObject* pynone_a() { return PyNone; }

EXPORTED_SYMBOL
int add10(int n) {
  // Open our dynamic library
  void* handle = dlopen("dist/dynamic-library.wasm.so", 2);
  // Fetch a pointer to the function that adds 10 from the library.
  FUN_PTR f = (FUN_PTR)dlsym(handle, "add10");
  return (*f)(n);
}