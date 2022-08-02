#include <stdio.h>
#include <assert.h>
#include "app.h"

extern void* dlopen(const char* filename, int flags);
extern void* dlsym(void* handle, const char* symbol);

// int _printf(const char* restrict format, ...) { return printf(format, ...); }

EXPORTED_SYMBOL
int PyModuleDef_Init(struct PyModuleDef* module) {
  printf("PyModuleDef_Init, module = %p \n", module);
  return 0;
}

typedef int (*INIT_FUNCTION)();

int main() {
  printf("Running Tests...\n");
  void* handle = dlopen("./hello.so", 2);
  // Fetch a pointer to the init function:
  INIT_FUNCTION init = (INIT_FUNCTION)dlsym(handle, "PyInit_hello");
  printf("PyInit_hello() = %d\n", (*init)());
  printf("All tests passed!\n");
}
