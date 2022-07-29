int x = 5;
int y = 4;
int z = 1;

#include "a.h"

EXPORTED_SYMBOL
PyObject* pynone_b() { return PyNone; }

int add10(const int a) { return a + x + y + z; }

typedef int (*FUN_PTR)(int);

EXPORTED_SYMBOL
FUN_PTR pointer_to_add10() { return &add10; }
