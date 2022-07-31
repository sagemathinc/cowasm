

// file should start with a blank line.

#include "posix-wasm.h"
#undef HAVE_LINUX_VM_SOCKETS_H
#define POLLPRI 0
#undef GETPGRP_HAVE_ARG

#define PY_CALL_TRAMPOLINE

// We only use the emscripten changes for the actual changes to the files, NOT for
// the extra flags, etc., that are imposed on the build tools, which break things badly.
// Thus instead of an option to ./configure, we #define these here.
#define __EMSCRIPTEN__
#define __EMSCRIPTEN_major__ 3
#define __EMSCRIPTEN_minor__ 1
#define __EMSCRIPTEN_tiny__ 16