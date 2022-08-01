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
  printf("add5077_using_func_from_main a=%d\n", a);
  return add5077(a);
}