#include "app.h"
#include "Python.h"
#include <stdio.h>

int x = 10;

extern size_t fwrite(const void *ptr, size_t size, size_t nmemb, FILE *stream);

EXPORTED_SYMBOL
void hello(void) {
  // use python to print hello.
  fwrite("foo", sizeof(char), 3, stdout);
  Py_InitializeEx(0);
  printf("hello world: %d\n", x);
}

EXPORTED_SYMBOL
int *my_x() { return &x; }