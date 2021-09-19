/*
zig cc hello.c
-I/home/user/sagemathjs/packages/python/dist/native/include/python3.9
-L/home/user/sagemathjs/packages/python/dist/native/lib -lpython3.9 -o hello


zig cc -target wasm32-wasi hello.c -dynamic -lc -o hello.wasm \
-I/home/user/sagemathjs/packages/python/dist/wasm/include/python3.9 \
/home/user/sagemathjs/packages/python/dist/wasm/lib/libpython3.9.a
*/

#include <Python.h>

extern int go(void) {
  const char* s = getenv("HOME");
  fprintf(stderr, "HOME=%s\n", s ? s : "");
  fprintf(stderr, "1\n");
  Py_Initialize();
  fprintf(stderr, "2\n");
  PyRun_SimpleString("print(sum(range(1,101)))\n");
  PyRun_SimpleString("import sys; sys.path.append('/home/user/sagemathjs/packages/sagejs/src/python')");
  PyRun_SimpleString("from xgcd import bench_xgcd; bench_xgcd()\n");
  return Py_FinalizeEx();
}

int main(void) { return go(); }