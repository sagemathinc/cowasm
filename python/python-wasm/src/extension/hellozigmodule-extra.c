#include <Python.h>
#include <stdio.h>

PyObject *hello(PyObject *self, PyObject *args) {
  (void)self;
  char *name = NULL;
  if (PyArg_ParseTuple(args, "s", &name) == 0) {
    return NULL;
  }
  fprintf(stderr, "Hello %s, from C!\n", name);
  return Py_NewRef(Py_None);
}

PyObject *add389(PyObject *self, PyObject *args) {
  (void)self;
  long n = 0;
  if (PyArg_ParseTuple(args, "l", &n) == 0) {
    return NULL;
  }
  return PyLong_FromLong(n + 389);
}

static long gcd(long a, long b) {
  while (b != 0) {
    long c = a % b;
    a = b;
    b = c;
  }
  return a;
}

PyObject *gcd_impl(PyObject *self, PyObject *args) {
  (void)self;
  long n = 0;
  long m = 0;
  if (PyArg_ParseTuple(args, "ll", &n, &m) == 0) {
    return NULL;
  }
  return PyLong_FromLong(gcd(n, m));
}
