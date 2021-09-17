/*
zig cc hello.c -I/home/user/sagemathjs/packages/python/dist/native/include/python3.9 -L/home/user/sagemathjs/packages/python/dist/native/lib -lpython3.9 -o hello
*/

#include <Python.h>

int main(void) {
  Py_Initialize();
  PyRun_SimpleString("print(2+3)\n");
  return Py_FinalizeEx();
}