#include <Python.h>
#include <unistd.h>

extern PyObject *hello(PyObject *self, PyObject *args);
extern PyObject *add389(PyObject *self, PyObject *args);
extern PyObject *gcd_impl(PyObject *self, PyObject *args);

static PyMethodDef module_methods[] = {
    {"hello", _PyCFunction_CAST(hello), METH_VARARGS, "Say hello to you."},
    {"add389", _PyCFunction_CAST(add389), METH_VARARGS, "Add 389 to a C long."},
    {"gcd", _PyCFunction_CAST(gcd_impl), METH_VARARGS, "GCD of two C longs"},
    {NULL, NULL, 0, NULL}};

static int module_clear(PyObject *module) { return 0; }

static void module_free(void *module) { module_clear((PyObject *)module); }

struct PyModuleDef _hellomodule = {
    .m_name = "hellozig",
    .m_methods = module_methods,
    .m_clear = module_clear,
    .m_free = module_free,
};

PyMODINIT_FUNC PyInit_hellozig(void) { return PyModuleDef_Init(&_hellomodule); }