
const char* x = "hi there";

#include "a.h"

EXPORTED_SYMBOL
int foo() { return x; }

EXPORTED_SYMBOL
int pynone_b() { return PyNone; }
