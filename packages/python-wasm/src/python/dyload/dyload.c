#include "Python.h"

__attribute__((visibility("default"))) void adjust_function_pointer_offsets(
    PyObject *mod, int offset) {
  PyObject *functools = PyImport_ImportModule("functools");
  printf("functool = %p\n", functools);

  printf("adjust_function_pointer_offsets, mod=%p, offset=%d\n", mod, offset);
  PyModuleDef *def = (PyModuleDef *)mod;
  PyModuleDef_Slot *cur_slot;
  for (cur_slot = def->m_slots; cur_slot && cur_slot->slot; cur_slot++) {
    printf("adjusting cur_slot->value=%p\n", cur_slot->value);
    cur_slot->value += offset;
    printf("now cur_slot->value=%p\n", cur_slot->value);
  }

  // TODO: probably lots of other function pointers to adjust?
  int i = 0;
  while (((def->m_methods)[i]).ml_meth != NULL) {
    ((def->m_methods)[i]).ml_meth += offset;
    i += 1;
  }
}

__attribute__((visibility("default"))) PyObject *import_test() {
  printf("Py_None = %p\n", Py_None);
  return Py_None;
  //PyObject *functools = PyImport_ImportModule("functools");
  //printf("functool = %p\n", functools);
  //return functools;
}