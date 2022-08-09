#include "posix-wasm.h"
#include "public.h"

#define STUB(x) printf("posix-wasm C STUB: %s\n", x);
char *strsignal(int sig) {
  STUB("strsignal");
  return "a signal";
}

gid_t getgid(void) { return 0; }
PUBLIC(getgid)

gid_t getegid(void) { return 0; }
PUBLIC(getegid)

uid_t getuid(void) { return 0; }
PUBLIC(getuid)

uid_t geteuid(void) { return 0; }
PUBLIC(geteuid)

// We are pid 1.
pid_t getpid(void) { return 1; }
PUBLIC(getpid)

// These three functions are about locking files for *threads*, and we don't
// support threads, so stubs are fine.
void flockfile(FILE *filehandle) {}
PUBLIC(flockfile)

int ftrylockfile(FILE *filehandle) { return 0; }
PUBLIC(ftrylockfile)

void funlockfile(FILE *filehandle) {}
PUBLIC(funlockfile)

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
