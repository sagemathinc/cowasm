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
