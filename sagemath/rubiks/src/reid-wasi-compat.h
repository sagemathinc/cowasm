#ifndef COWASM_RUBIKS_REID_WASI_COMPAT_H
#define COWASM_RUBIKS_REID_WASI_COMPAT_H

#include <stdlib.h>

#define _SETJMP_H
typedef int sigjmp_buf[1];
#define sigsetjmp(env, savesigs) (0)
#define siglongjmp(env, value) exit(value)

#include <signal.h>
#undef signal
#define signal(sig, handler) ((void)0)

#endif
