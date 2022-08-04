#include <stdio.h>
#include <assert.h>
#include "app.h"

extern void* dlopen(const char* filename, int flags);
extern void* dlsym(void* handle, const char* symbol);

int x = 5077;
int y = 123;

EXPORTED_SYMBOL
PyObject _Py_NoneStruct = {.thingy = 1};

#ifndef WASM_EXPORT
#define WASM_EXPORT(x) __attribute__((visibility("default"))) void* __WASM_EXPORT__##x() { return &(x);}
#endif
WASM_EXPORT(_Py_NoneStruct)

EXPORTED_SYMBOL
PyObject* pynone_a() { return PyNone; }

typedef PyObject* (*FUN_PY_PTR)();

EXPORTED_SYMBOL
int pynones_match() {
  // return 1 if PyNone same here and in so module.
  void* handle = dlopen("./dynamic-library.so", 2);
  // Fetch a pointer to the function that adds 10 from the library.
  FUN_PY_PTR f = (FUN_PY_PTR)dlsym(handle, "pynone_b");
  if (pynone_a() == (*f)()) {
    return 1;
  } else {
    return 0;
  }
}

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

// This is going to get called by the dynamic library to do something.
EXPORTED_SYMBOL
int add5077(int n) { return n + 5077; }

EXPORTED_SYMBOL
int add5077_using_lib_using_main(int n) {
  void* handle = dlopen("./dynamic-library.so", 2);
  // Fetch a pointer to the function that adds 389 from the library.
  FUN_PTR f = (FUN_PTR)dlsym(handle, "add5077_using_func_from_main");
  return (*f)(n);
}

// int _printf(const char* restrict format, ...) { return printf(format, ...); }

int main() {
  printf("add10(2022) = %d\n", add10(2022));
  assert(add10(2022) == 2022 + 10);

  printf("add10b(2022) = %d\n", add10(2022));
  assert(add10b(2022) == 2022 + 10);

  printf("add389(2022) = %d\n", add389(2022));
  assert(add389(2022) == 2022 + 389);

  int n = add5077_using_lib_using_main(389);
  printf("add5077_using_lib_using_main(389) = %d\n", n);
  assert(n == 5077 + 389);

  printf("pynones_match() = %d\n", pynones_match());
  assert(pynones_match() == 1);

  printf("All tests passed!\n");
}
