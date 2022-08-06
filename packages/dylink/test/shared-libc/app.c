#include <stdio.h>
#include <assert.h>
#include "app.h"

extern void* dlopen(const char* filename, int flags);
extern void* dlsym(void* handle, const char* symbol);

int main() {
  printf("Loading libc dynamic library...\n");
  void* libcHandle = dlopen("./libc.so", 2);
  printf("Got libcHandle=%p\n", libcHandle);
  assert(libcHandle != NULL);

  printf("Loading hello dynamic library...\n");
  void* handle = dlopen("./hello.so", 2);
  printf("Got handle=%p\n", handle);
  assert(handle != NULL);
  FUNCTION hello = (FUNCTION)dlsym(handle, "hello");
  assert(hello != NULL);
  printf("Got hello=%p\n", hello);
  printf("hello():\n\n");
  (*hello)();

  printf("\nDone\n");
}

