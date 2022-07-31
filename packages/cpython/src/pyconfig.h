

// file should start with a blank line.

#include "posix-wasm.h"
#undef HAVE_LINUX_VM_SOCKETS_H
#define POLLPRI 0
#define __WASM__ 1
#undef GETPGRP_HAVE_ARG

#define PY_CALL_TRAMPOLINE

// Maybe we can do this someday instead of having to patch everything individually.
// We only emscripten for the actual changes to the files, NOT for
// the extra flags, etc., that are imposed on the build tools.
// #define __EMSCRIPTEN__
// #define __EMSCRIPTEN_major__ 0
// #define __EMSCRIPTEN_minor__ 0
// #define __EMSCRIPTEN_tiny__ 0