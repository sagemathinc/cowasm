#include "posix-wasm.h"

#define STUB(x) printf("posix-wasm C STUB: %s\n", x);
char* strsignal(int sig) {
  STUB("strsignal");
  return "a signal";
}

gid_t getgid(void) { return 0; }
gid_t getegid(void) { return 0; }
uid_t getuid(void) { return 0; }
uid_t geteuid(void) { return 0; }

// We are pid 1.
pid_t getpid(void) { return 1; }