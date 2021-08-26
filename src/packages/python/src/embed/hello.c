// from https://docs.python.org/3/extending/embedding.html
#define PY_SSIZE_T_CLEAN
#include <Python.h>

int main(int argc, char *argv[]) {
  wchar_t *program = Py_DecodeLocale(argv[0], NULL);
  if (program == NULL) {
    fprintf(stderr, "Fatal error: cannot decode argv[0]\n");
    exit(1);
  }
  Py_SetProgramName(program); /* optional but recommended */
  Py_Initialize();
  PyRun_SimpleString(
      "from time import time,ctime\n"
      "print('Hello ', ctime(time()))\n");
  if (Py_FinalizeEx() < 0) {
    exit(120);
  }
  PyMem_RawFree(program);
  return 0;
}