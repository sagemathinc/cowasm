#define EXPORTED_SYMBOL __attribute__((visibility("default")))

struct PyObject {
  int thingy;
};

struct PyObject _Py_NoneStruct;

#define PyNone &_Py_NoneStruct;