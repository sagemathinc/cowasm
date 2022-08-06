#include "app.h"
#include "Python.h"
#include <stdio.h>

int x = 10;

extern size_t fwrite(const void *ptr, size_t size, size_t nmemb, FILE *stream);

EXPORTED_SYMBOL
void hello(void) {
  // use python to print hello.
  Py_InitializeEx(0);
  PyObject *globals = PyDict_New();
  PyRun_String("print('hello from CPython!', 2+3)", Py_file_input, globals, globals);
  Py_FinalizeEx();
}
