#include "posix-wasm.h"
#include "public.h"


// These two are missing from zig's libc for some reason:
#include <stdarg.h>
#include<stdio.h>
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
PUBLIC(siprintf)

// "The interface __stack_chk_fail() shall abort the function that called it
// with a message that a stack overflow has been detected. The program that
// called the function shall then exit.  The interface
// __stack_chk_fail() does not check for a stack overflow itself. It merely
// reports one when invoked."
void __stack_chk_fail(void) {
  fprintf(stderr, "A stack overflow has been detected.\n");
  exit(1);
}
PUBLIC(__stack_chk_fail)
