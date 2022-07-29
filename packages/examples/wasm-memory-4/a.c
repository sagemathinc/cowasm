
int xyz = 389;
const char* name = "William";

#include "a.h"
int g() {
  return xyz+1;
}

EXPORTED_SYMBOL
PyObject* pynone_a() {
  // printf("in 'a.dylib' -- PyNone = %p\n", PyNone);
  return PyNone;
}

EXPORTED_SYMBOL
PyObject* pysome_a() { return PySomething; }


typedef int (*FUN_PTR)(int);
extern FUN_PTR pointer_to_add10();

EXPORTED_SYMBOL
int add10(int a) {
  FUN_PTR f = pointer_to_add10();
  return (*f)(a) + xyz;
}