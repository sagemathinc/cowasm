#include "Python.h"

__attribute__ ((visibility ("default")))
void adjust_function_pointer_offsets(PyObject* mod,  int offset) {
  printf("adjust_function_pointer_offsets, mod=%p, offset=%d\n", mod, offset);
}


