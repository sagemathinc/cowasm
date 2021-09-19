/*

zig cc -target wasm32-wasi python.c -fvisibility=hidden \
-dynamic -lc -o python.wasm \
-I/home/user/sagemathjs/packages/python/dist/wasm/include/python3.9 \
/home/user/sagemathjs/packages/python/dist/wasm/lib/libpython3.9.a

 zig cc -target wasm32-wasi -c python.c -o python.o -I/home/user/sagemathjs/packages/python/dist/wasm/include/python3.9 /home/user/sagemathjs/packages/python/dist/wasm/lib/libpython3.9.a

STATUS: I **can** get my zig build of Python to work via a pure c interface via
the main function only.

But

- when I try to use zig, it breaks the WASI filesystem and env stuff.  Makes no
sense!

- I absolutely can't figure out how to build C code that exports anything that
can be then used from node.js.  This is very weird, since there's random pages
online about how to do it this export macro should work.  It doesn't.

*/

#include <Python.h>

#include <stdio.h>
#include <stdlib.h>

#define export __attribute__((visibility("default")))

export void python_Py_Initialize(void) { Py_Initialize(); }

export void python_PyRun_SimpleString(const char* s) { PyRun_SimpleString(s); }

export void python_Py_FinalizeEx(void) { Py_FinalizeEx(); }

export void python_home(void) {
  const char* s = getenv("HOME");
  printf("HOME=%s\n", s ? s : "");
}

int main(void) {
  Py_Initialize();
  python_PyRun_SimpleString("print('hello', sum(range(101)))");
  Py_FinalizeEx();
}

// int main(void) { python_home(); }