

// file should start with a blank line.

// This extern "C" is needed so pyconfig.h can also be included in C++ code, e.g., numpy.
#ifdef __cplusplus
extern "C" {
#endif
#include "posix-wasm.h"
#ifdef __cplusplus
}
#endif


#undef HAVE_LINUX_VM_SOCKETS_H
#define POLLPRI 0
#undef GETPGRP_HAVE_ARG

// I did implement the non-BSD version of this though, which
// doesn't get detected by autoconf:
#define SETPGRP_HAVE_ARG 1

#define PY_CALL_TRAMPOLINE

// We only use the emscripten changes for the actual changes to the files, NOT for
// the extra flags, etc., that are imposed on the build tools, which break things badly.
// Thus instead of an option to ./configure, we #define these here.
#ifndef __EMSCRIPTEN
  #define __EMSCRIPTEN__ 1
#endif
#define __EMSCRIPTEN_major__ 3
#define __EMSCRIPTEN_minor__ 1
#define __EMSCRIPTEN_tiny__ 16

// sysconfig(_SC_OPEN_MAX) = -1 in upstream musl wasi.
// By undef'ing this constant, we cause Python to think
// that sysconfig doesn't know anything about SC_OPEN_MAX,
// so Python falls back to some default.  This is the right
// thing to do since (1) we can't change upstream wasi, and
// (2) wasi setting it to -1 is meant to convey that they
// don't know.   In fact, in our wasi-js implementation,
// we are setting the limit to 32768 since it takes about
// 0.2 seconds with wasi-js to stat everything up that bound,
// which seems acceptable for this sort of thing.
// The modern OS default is 2**20 = 1048575, and it takes
// about 0.5 seconds to stat everything up to that (of course,
// modern os's have better system calls so that stating everything
// isn't needed).  TODO: I'm also probably going to patch Python
// itself to replace its 256 default fallback with 32768 everywhere,
// though that can wait.
#undef _SC_OPEN_MAX

// we provide our own stubs
#undef HAVE_PTHREAD_STUBS