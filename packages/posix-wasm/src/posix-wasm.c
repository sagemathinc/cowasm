#include "posix-wasm.h"
#include "public.h"

// These two are missing from zig's libc for some reason.  I don't think
// it is possible to express these in ziglang either.
#include <stdarg.h>
#include <stdio.h>
int fiprintf(FILE * stream, const char * format, ...) {
  va_list va;
  va_start(va, format);
  int d = vfprintf(stream, format, va);
  va_end(va);
  return d;
}
PUBLIC(fiprintf)

int __small_fprintf(FILE * stream, const char * format, ...) {
  va_list va;
  va_start(va, format);
  int d = vfprintf(stream, format, va);
  va_end(va);
  return d;
}
PUBLIC(__small_fprintf)

int siprintf(char * s, const char * format, ...) {
  va_list va;
  va_start(va, format);
  int d = vsprintf(s, format, va);
  va_end(va);
  return d;
}
PUBLIC(siprintf)

#include <signal.h>
// It is important to define this function to actually do something, rather
// than be a pure stub function, in the case we are asking for what the
// signal handler is.  This is requested in Python's PyOS_getsig, and if
// we just don't set it, then the handler is considered random nonsense.
// That's not good, since then the proper handlers from python, e.g., the
// one for sigint, don't get setup in Python's signal_get_set_handlers function.
int sigaction(int signum, const struct sigaction *restrict act,
  struct sigaction *restrict oldact) {
  if(act == NULL && oldact != NULL) { // getting the signal info.
    oldact->sa_handler = SIG_DFL; // only this matters for python
    oldact->sa_mask = 0;
    oldact->sa_flags = 0;
  }
  return 0;
}
