#include "app.h"

EXPORTED_SYMBOL
PyObject* pynone_b() { return PyNone; }

EXPORTED_SYMBOL
int add10(const int a) { return a + 10; }

EXPORTED_SYMBOL
FUN_PTR pointer_to_add10() { return &add10; }

