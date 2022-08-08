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
