#include <Python.h>

static PyObject *hello(PyObject *self, PyObject *args) {
  const char *name;
  printf("in hello, self=%p, args=%p\n", self, args);
  while(1) { }

//   if (!PyArg_ParseTuple(args, "s", &name)) {
//     return NULL;
//   }

//   printf("python-wasm: 'hello %s!'\n", name);

  Py_RETURN_NONE;
}

static PyMethodDef module_methods[] = {
    {"hello", _PyCFunction_CAST(hello), METH_VARARGS, "Say hello to you."}, {NULL, NULL, 0, NULL}};

struct PyModuleDef _hellomodule = {
    .m_base = PyModuleDef_HEAD_INIT,
    .m_name = "hello",
    .m_methods = module_methods,
};

PyMODINIT_FUNC PyInit_hello(void) {
  printf("PyInit_hello\n");
  // initialize the module:
  return PyModuleDef_Init(&_hellomodule);
}