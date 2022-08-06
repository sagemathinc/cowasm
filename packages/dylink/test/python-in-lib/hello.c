#include "app.h"
#include "Python.h"
#include <stdio.h>

int x = 10;

extern size_t fwrite(const void *ptr, size_t size, size_t nmemb, FILE *stream);

EXPORTED_SYMBOL
void hello(void) {
  // use python to print hello.
  printf("calling Py_InitializeEx(0):\n");
  Py_InitializeEx(0);
  printf("successfully called Py_InitializeEx(0);\n");
}

EXPORTED_SYMBOL
int *my_x() { return &x; }