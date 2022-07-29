#include <dlfcn.h>
#include <stdio.h>
#include "a.h"

typedef PyObject* (*myfun)();

int main() {
  void* handle = dlopen("./a.native.dylib", 2);
  printf("handle = %p\n", handle);
  void* f = dlsym(handle, "pynone_a");
  printf("f = %p\n", f);
  printf("f() = %p\n", ((myfun)f)());
}