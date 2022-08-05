#include <math.h>
#include <stdio.h>
#include <assert.h>
#include "app.h"

extern void* dlopen(const char* filename, int flags);
extern void* dlsym(void* handle, const char* symbol);

typedef void (*FUNCTION)();
typedef int* (*FUNCTION2)();

int main() {
  printf("Loading dynamic library...\n");
  void* handle = dlopen("./hello.so", 2);
  printf("Got handle=%p\n", handle);
  assert(handle != NULL);
  FUNCTION hello = (FUNCTION)dlsym(handle, "hello");
  assert(hello != NULL);
  printf("Got hello=%p\n", hello);
  printf("hello():\n\n");
  (*hello)();
  FUNCTION2 my_x = (FUNCTION2)dlsym(handle, "my_x");
  assert(my_x != NULL);
  printf("my_x() = %p, x=%d\n", (*my_x)(),  *((*my_x)()));
  printf("\nDone\n");
}
