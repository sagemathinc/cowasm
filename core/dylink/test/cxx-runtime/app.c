#include <assert.h>
#include <stdio.h>

extern void* dlopen(const char* filename, int flags);
extern void* dlsym(void* handle, const char* symbol);

typedef int (*STRING_SIZE)(const char*);

int main() {
  void* handle = dlopen("./lib.so", 2);
  assert(handle != 0);

  STRING_SIZE string_size = (STRING_SIZE)dlsym(handle, "string_size");
  assert(string_size != 0);

  int n = string_size("cowasm");
  printf("string_size('cowasm') = %d\n", n);
  assert(n == 7);

  printf("C++ runtime test passed!\n");
}
