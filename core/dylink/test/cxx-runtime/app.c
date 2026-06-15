#include <assert.h>
#include <stdio.h>

extern void* dlopen(const char* filename, int flags);
extern void* dlsym(void* handle, const char* symbol);

typedef int (*STRING_SIZE)(const char*);
typedef int (*RTTI_MATCHES)();
typedef int (*C_ADD)(int);

int main() {
  void* handle1 = dlopen("./lib.so", 2);
  void* handle2 = dlopen("./lib.so", 2);
  assert(handle1 != 0);
  assert(handle1 == handle2);

  STRING_SIZE string_size1 = (STRING_SIZE)dlsym(handle1, "string_size");
  STRING_SIZE string_size2 = (STRING_SIZE)dlsym(handle2, "string_size");
  assert(string_size1 != 0);
  assert(string_size1 == string_size2);

  int n = string_size1("cowasm");
  printf("string_size('cowasm') = %d\n", n);
  assert(n == 7);

  RTTI_MATCHES rtti_matches = (RTTI_MATCHES)dlsym(handle1, "rtti_matches");
  assert(rtti_matches != 0);
  printf("rtti_matches() = %d\n", rtti_matches());
  assert(rtti_matches() == 1);

  void* c_handle = dlopen("./c-lib.so", 2);
  assert(c_handle != 0);

  C_ADD c_add = (C_ADD)dlsym(c_handle, "c_add");
  assert(c_add != 0);
  printf("c_add(31) = %d\n", c_add(31));
  assert(c_add(31) == 42);

  printf("C++ runtime test passed!\n");
}
