#include <math.h>
#include <stdio.h>
#include <assert.h>
#include "app.h"

extern void* dlopen(const char* filename, int flags);
extern void* dlsym(void* handle, const char* symbol);

typedef void (*FUNCTION)();

int main() {
  printf("Running Tests...\n");
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
