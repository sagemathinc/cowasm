#define EXPORTED_SYMBOL __attribute__((visibility("default")))

struct PyObjectX {
  int thingy;
};

typedef struct PyObjectX PyObject;

//extern
//PyObject _Py_NoneStruct;


EXPORTED_SYMBOL
PyObject _Py_NoneStruct = {.thingy = 1};

#define PyNone (&_Py_NoneStruct)

typedef int (*FUN_PTR)(int);
