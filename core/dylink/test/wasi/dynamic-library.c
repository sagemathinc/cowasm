#include <stdio.h>
#include <stdlib.h>
#include <string.h>
//#include <assert.h>
#include "app.h"

static int x = 388;
int y = 1;

EXPORTED_SYMBOL
PyObject* pynone_b() { return PyNone; }

EXPORTED_SYMBOL
int add10(const int a) { return a + 10; }

EXPORTED_SYMBOL
FUN_PTR pointer_to_add10() { return &add10; }

EXPORTED_SYMBOL
int add389(const int a) { return a + x + y; }

// This illustrates calling a function that is
// defined in the main app.c.
extern int add5077(int a);

EXPORTED_SYMBOL
int add5077_using_func_from_main(int a) {
  // This uses WASI!
  printf("Print from dynamic-library! add5077_using_func_from_main a=%d\n", a);
  void* mem = malloc(32);
  printf("I got some memory here: %p\n", mem);
  free(mem);
  int n = add5077(a - strlen("four") + 4);
  // doesn't work due to issue with __assert_fail not being defined:
  // assert(n == a + 5077);
  return n;
}