// These two are missing from zig's libc for some reason.  I don't think
// it is possible to express these in ziglang either.
#include <stdarg.h>
#include <stdio.h>
int fiprintf(FILE *restrict stream, const char *restrict format, ...) {
  va_list va;
  va_start(va, format);
  vfprintf(stream, format, va);
  va_end(va);
}
PUBLIC(fiprintf)

int siprintf(char *restrict s, const char *restrict format, ...) {
  va_list va;
  va_start(va, format);
  vsprintf(s, format, va);
  va_end(va);
}
