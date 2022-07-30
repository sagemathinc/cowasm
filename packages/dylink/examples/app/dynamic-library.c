#include "app.h"


int x = -10000;
int y = 4;
int z = 1;


EXPORTED_SYMBOL
PyObject* pynone_b() { return PyNone; }

EXPORTED_SYMBOL
PyObject* pysome_b() { return PySomething; }

typedef int (*FUN_PTR)(int);

int add10(const int a) { return a + 10; }
EXPORTED_SYMBOL
FUN_PTR pointer_to_add10() { return &add10; }


int add389(const int a) { return a + 389; }
EXPORTED_SYMBOL
FUN_PTR pointer_to_add389() { return &add389; }

EXPORTED_SYMBOL
int my_add10(int n) {
  FUN_PTR ptr = pointer_to_add10();
  return (*ptr)(n);
}