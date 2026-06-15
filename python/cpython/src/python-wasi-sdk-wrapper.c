#include "Python.h"

#include <arpa/inet.h>
#include <errno.h>
#include <netdb.h>
#include <pthread.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

extern void wasmSendString(const char *ptr, size_t len);
extern void wasmSetException(void);
extern unsigned char __memory_base;
extern void *cowasm_env_malloc(size_t size)
    __attribute__((import_module("env"), import_name("malloc")));
extern void *cowasm_env_calloc(size_t nelem, size_t elsize)
    __attribute__((import_module("env"), import_name("calloc")));
extern void *cowasm_env_realloc(void *ptr, size_t size)
    __attribute__((import_module("env"), import_name("realloc")));
extern void cowasm_env_free(void *ptr)
    __attribute__((import_module("env"), import_name("free")));
extern uintptr_t cowasm_memory_size(void)
    __attribute__((import_module("env"), import_name("__memory_size")));

#ifndef HOST_NOT_FOUND
#define HOST_NOT_FOUND 1
#endif

static int didInit = 0;
static PyObject *globals = NULL;

int h_errno = 0;

__attribute__((visibility("hidden"))) int Py_EMSCRIPTEN_SIGNAL_HANDLING = 0;
__attribute__((visibility("hidden"))) int _Py_emscripten_signal_clock = 50;

#define COWASM_PTHREAD_KEYS 64

// Keep SDK CPython pthread calls local. CoWasm's main runtime exports pthread
// stubs with a different struct layout than wasi-sdk's pthread.h.
static void *pthread_key_values[COWASM_PTHREAD_KEYS];
static pthread_key_t next_pthread_key = 1;

int
pthread_mutex_init(pthread_mutex_t *mutex, const pthread_mutexattr_t *attr)
{
    return 0;
}

int
pthread_mutex_destroy(pthread_mutex_t *mutex)
{
    return 0;
}

int
pthread_mutex_lock(pthread_mutex_t *mutex)
{
    return 0;
}

int
pthread_mutex_unlock(pthread_mutex_t *mutex)
{
    return 0;
}

int
pthread_mutex_trylock(pthread_mutex_t *mutex)
{
    return 0;
}

int
pthread_cond_init(pthread_cond_t *cond, const pthread_condattr_t *attr)
{
    return 0;
}

int
pthread_cond_destroy(pthread_cond_t *cond)
{
    return 0;
}

int
pthread_cond_signal(pthread_cond_t *cond)
{
    return 0;
}

int
pthread_cond_wait(pthread_cond_t *cond, pthread_mutex_t *mutex)
{
    return 0;
}

int
pthread_cond_timedwait(
    pthread_cond_t *cond, pthread_mutex_t *mutex, const struct timespec *abstime)
{
    return 0;
}

int
pthread_condattr_init(pthread_condattr_t *attr)
{
    return 0;
}

int
pthread_condattr_setclock(pthread_condattr_t *attr, clockid_t clock_id)
{
    return 0;
}

int
pthread_attr_init(pthread_attr_t *attr)
{
    return 0;
}

int
pthread_attr_destroy(pthread_attr_t *attr)
{
    return 0;
}

int
pthread_attr_setstacksize(pthread_attr_t *attr, size_t stacksize)
{
    return 0;
}

int
pthread_attr_setscope(pthread_attr_t *attr, int scope)
{
    return 0;
}

int
pthread_create(
    pthread_t *thread, const pthread_attr_t *attr, void *(*start_routine)(void *),
    void *arg)
{
    errno = ENOSYS;
    return ENOSYS;
}

int
pthread_detach(pthread_t thread)
{
    return 0;
}

int
pthread_join(pthread_t thread, void **retval)
{
    return 0;
}

pthread_t
pthread_self(void)
{
    return (pthread_t)1;
}

int
pthread_key_create(pthread_key_t *key, void (*destructor)(void *))
{
    if (next_pthread_key >= COWASM_PTHREAD_KEYS) {
        return EAGAIN;
    }
    *key = next_pthread_key++;
    return 0;
}

int
pthread_key_delete(pthread_key_t key)
{
    if (key < COWASM_PTHREAD_KEYS) {
        pthread_key_values[key] = NULL;
    }
    return 0;
}

int
pthread_setspecific(pthread_key_t key, const void *value)
{
    if (key >= COWASM_PTHREAD_KEYS) {
        return EINVAL;
    }
    pthread_key_values[key] = (void *)value;
    return 0;
}

void *
pthread_getspecific(pthread_key_t key)
{
    if (key >= COWASM_PTHREAD_KEYS) {
        return NULL;
    }
    return pthread_key_values[key];
}

struct hostent *
getipnodebyaddr(const void *addr, size_t len, int af, int *error_num)
{
    if (error_num != NULL) {
        *error_num = HOST_NOT_FOUND;
    }
    return NULL;
}

void
freehostent(struct hostent *ent)
{
}

static int
is_forwardable_runtime_pointer(const void *ptr)
{
    uintptr_t p = (uintptr_t)ptr;
    uintptr_t base = (uintptr_t)&__memory_base;
    uintptr_t side_module_end = base + cowasm_memory_size();
    uintptr_t linear_memory_size =
        (uintptr_t)__builtin_wasm_memory_size(0) * 65536;
    return p >= side_module_end && p < linear_memory_size;
}

void *
malloc(size_t size)
{
    return cowasm_env_malloc(size);
}

void *
calloc(size_t nelem, size_t elsize)
{
    return cowasm_env_calloc(nelem, elsize);
}

void *
realloc(void *ptr, size_t size)
{
    if (ptr == NULL) {
        return malloc(size);
    }
    if (!is_forwardable_runtime_pointer(ptr)) {
        return malloc(size);
    }
    return cowasm_env_realloc(ptr, size);
}

void
free(void *ptr)
{
    if (ptr == NULL || !is_forwardable_runtime_pointer(ptr)) {
        return;
    }
    cowasm_env_free(ptr);
}

char *
inet_ntoa(struct in_addr in)
{
    static char buf[16];
    const unsigned char *addr = (const unsigned char *)&in.s_addr;
    snprintf(buf, sizeof(buf), "%u.%u.%u.%u", addr[0], addr[1], addr[2], addr[3]);
    return buf;
}

int
fchdir(int fd)
{
    errno = ENOSYS;
    return -1;
}

__attribute__((visibility("default")))
void
keepalive(void)
{
}

__attribute__((visibility("default")))
void *
c_malloc(size_t n)
{
    return malloc(n);
}

__attribute__((visibility("default")))
void
c_free(void *ptr)
{
    free(ptr);
}

__attribute__((visibility("default")))
int
cowasm_python_init(void)
{
    if (didInit) {
        return 0;
    }

    Py_Initialize();
    if (PyRun_SimpleString(
            "try:\n"
            "    import cowasm_importer\n"
            "    cowasm_importer.init()\n"
            "except ModuleNotFoundError as err:\n"
            "    if err.name != 'cowasm_importer':\n"
            "        raise\n") != 0) {
        return 1;
    }

    globals = PyDict_New();
    if (globals == NULL) {
        return 1;
    }

    didInit = 1;
    return 0;
}

static int
assert_init(void)
{
    if (!didInit) {
        fprintf(stderr, "call init() first\n");
        return 1;
    }
    return 0;
}

__attribute__((visibility("default")))
int
cowasm_python_repr(const char *s)
{
    if (assert_init() != 0) {
        wasmSetException();
        return 1;
    }

    PyObject *value = PyRun_String(s, Py_eval_input, globals, globals);
    if (value == NULL) {
        PyErr_Clear();
        wasmSetException();
        return 1;
    }

    PyObject *repr = PyObject_Repr(value);
    Py_DECREF(value);
    if (repr == NULL) {
        PyErr_Clear();
        wasmSetException();
        return 1;
    }

    const char *text = PyUnicode_AsUTF8(repr);
    if (text == NULL) {
        Py_DECREF(repr);
        PyErr_Clear();
        wasmSetException();
        return 1;
    }

    wasmSendString(text, strlen(text));
    Py_DECREF(repr);
    return 0;
}

__attribute__((visibility("default")))
int
cowasm_python_exec(const char *s)
{
    if (assert_init() != 0) {
        wasmSetException();
        return 1;
    }

    PyObject *value = PyRun_String(s, Py_file_input, globals, globals);
    if (value == NULL) {
        PyErr_Clear();
        wasmSetException();
        return 1;
    }

    Py_DECREF(value);
    return 0;
}

__attribute__((visibility("default")))
int
cowasm_python_terminal(int argc, char **argv)
{
    return Py_BytesMain(argc, argv);
}

__attribute__((visibility("default")))
int
__main_argc_argv(int argc, char **argv)
{
    return cowasm_python_terminal(argc, argv);
}
