#include <Python.h>
#include <unistd.h>

static PyObject *hello(PyObject *self, PyObject *args) {
  const char *name;
  if (!PyArg_ParseTuple(args, "s", &name)) {
    return NULL;
  }
  printf("Hello %s, from C!\n", name);
  Py_RETURN_NONE;
}

static PyObject *add389(PyObject *self, PyObject *args) {
  const long n;
  if (!PyArg_ParseTuple(args, "l", &n)) {
    return NULL;
  }
  return PyLong_FromLong(n + 389);
}

long gcd(long a, long b) {
  long c;
  long a0 = a;
  long b0 = b;
  while (b0 != 0) {
    c = a0 % b0;
    a0 = b0;
    b0 = c;
  }
  return a0;
}
static PyObject *gcd_impl(PyObject *self, PyObject *args) {
  const long n, m;
  if (!PyArg_ParseTuple(args, "ll", &n, &m)) {
    return NULL;
  }
  return PyLong_FromLong(gcd(n, m));
}



static PyMethodDef module_methods[] = {
    {"hello", _PyCFunction_CAST(hello), METH_VARARGS, "Say hello to you."},
    {"add389", _PyCFunction_CAST(add389), METH_VARARGS, "Add 389 to a C long."},
    {"gcd", _PyCFunction_CAST(gcd_impl), METH_VARARGS, "GCD of two C longs."},
    {NULL, NULL, 0, NULL}};

static int module_clear(PyObject *module) { return 0; }

static void module_free(void *module) { module_clear((PyObject *)module); }

struct PyModuleDef _hellomodule = {
    .m_name = "hello",
    .m_methods = module_methods,
    .m_clear = module_clear,
    .m_free = module_free,
};

PyMODINIT_FUNC PyInit_hello(void) {
  // printf("PyInit_hello\n");
  // initialize the module:
  return PyModuleDef_Init(&_hellomodule);
}