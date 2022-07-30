#include "app.h"

extern void* dlopen(const char* filename, int flags);
void *dlsym(void *handle, const char * symbol);

EXPORTED_SYMBOL
PyObject* pynone_a() { return PyNone; }

EXPORTED_SYMBOL
int add10(int n) {
  // Open our dynamic library
  void* handle = dlopen("dist/dynamic-library.wasm.so", 2);

  // Fetch a pointer to the function that adds 10 from the library.
  void* f = dlsym(handle, "add10");

  // Cast and call it:
  //ADD_FUN_PTR g = (ADD_FUN_PTR)f;
  // return (*g)(n);

  return n + 10;
}