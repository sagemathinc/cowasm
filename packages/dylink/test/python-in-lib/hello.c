#include "app.h"
#include "Python.h"
#include <stdio.h>

int x = 10;

EXPORTED_SYMBOL
void hello(void) {
  // use python to print hello.
  Py_Initialize();
  printf("hello world: %d\n", x);
}

EXPORTED_SYMBOL
int* my_x() { return &x; }