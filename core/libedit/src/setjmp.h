#ifndef COWASM_LIBEDIT_STANDALONE_SETJMP_H
#define COWASM_LIBEDIT_STANDALONE_SETJMP_H

#include <stdlib.h>

typedef int jmp_buf[1];

static inline int setjmp(jmp_buf env) {
  (void)env;
  return 0;
}

__attribute__((noreturn)) static inline void longjmp(jmp_buf env, int value) {
  (void)env;
  (void)value;
  abort();
}

#endif
