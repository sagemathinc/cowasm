#include "app.h"

EXPORTED_SYMBOL
PyObject* pynone_b() { return PyNone; }

int add10(const int a) { return a + 10; }

EXPORTED_SYMBOL
ADD_FUN_PTR pointer_to_add10() { return &add10; }
