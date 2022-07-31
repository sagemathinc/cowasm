#include "app.h"
extern void* dlopen(const char* filename, int flags);
void* dlsym(void* handle, const char* symbol);

int x = 5077;
int y = 123;

EXPORTED_SYMBOL
PyObject* pynone_a() { return PyNone; }

EXPORTED_SYMBOL
int add10(int n) {
  // Open our dynamic library
  void* handle = dlopen("./dynamic-library.so", 2);
  // Fetch a pointer to the function that adds 10 from the library.
  FUN_PTR f = (FUN_PTR)dlsym(handle, "add10");
  return (*f)(n);
}

typedef void* (*FUN0_PTR)();

EXPORTED_SYMBOL
int add10b(int n) {
  // Open our dynamic library
  void* handle = dlopen("./dynamic-library.so", 2);
  // Fetch a pointer to the function that adds 10 from the library.
  FUN0_PTR f = (FUN0_PTR)dlsym(handle, "pointer_to_add10");
  void* ptr = (*f)();
  FUN_PTR g = (FUN_PTR)ptr;
  return (*g)(n);
}

EXPORTED_SYMBOL
int add389(int n) {
  // Open our dynamic library
  void* handle = dlopen("./dynamic-library.so", 2);
  // Fetch a pointer to the function that adds 389 from the library.
  FUN_PTR f = (FUN_PTR)dlsym(handle, "add389");
  return (*f)(n);
}
