#ifndef COWASM_LRSLIB_WASI_COMPAT_H
#define COWASM_LRSLIB_WASI_COMPAT_H

#include <errno.h>

static inline int cowasm_lrslib_mkstemp(char *template) {
  (void)template;
  errno = ENOSYS;
  return -1;
}

#define mkstemp cowasm_lrslib_mkstemp

#endif
