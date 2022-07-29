

int x = -10000;
int y = 4;
int z = 1;

#include "a.h"

EXPORTED_SYMBOL
PyObject* pynone_b() { return PyNone; }

int add10(const int a) { return a + 10; }

typedef int (*FUN_PTR)(int);

EXPORTED_SYMBOL
FUN_PTR pointer_to_add10() { return &add10; }

typedef int adder(const int);
