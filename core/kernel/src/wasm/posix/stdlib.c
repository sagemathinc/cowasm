#define _BSD_SOURCE
#include <stdlib.h>
#include <string.h>
#include <fcntl.h>
#include <unistd.h>
#include <errno.h>

// Copied from upstream musl, starting at
// zig/lib/libc/wasi/libc-top-half/musl/src/temp/mkstemp.c Probably a better
// approach would be to CHANGE ZIG so it builds more of libc!?  Why the heck
// doesn't it already build mkstemp?  Maybe it is because they just want to
// support the zig language, not a C build toolchain like emscripten is...?  Or
// it could be the __randname isn't allowed in pure WASM.

#include <time.h>
extern int __clock_gettime(clockid_t, struct timespec *);
char *__randname(char *template) {
  int i;
  struct timespec ts;
  unsigned long r;

  __clock_gettime(CLOCK_REALTIME, &ts);
  // original code was this, but it crashes in webassembly:
  // r = ts.tv_nsec * 65537 ^ (uintptr_t)&ts / 16 + (uintptr_t) template;
  // So instead we use this.  It is just a source of non-cryptographic
  // randomness, so it's fine:
  r = ts.tv_nsec;
  for (i = 0; i < 6; i++, r >>= 5) {
    template[i] = 'A' + (r & 15) + (r & 16) * 2;
  }

  return template;
}

int __mkostemps(char *template, int len, int flags) {
  size_t l = strlen(template);
  if (l < 6 || len > l - 6 || memcmp(template + l - len - 6, "XXXXXX", 6)) {
    errno = EINVAL;
    return -1;
  }

  flags -= flags & O_ACCMODE;
  int fd, retries = 100;
  do {
    __randname(template + l - len - 6);
    if ((fd = open(template, flags | O_RDWR | O_CREAT | O_EXCL, 0600)) >= 0) {
      return fd;
    }
  } while (--retries && errno == EEXIST);

  memcpy(template + l - len - 6, "XXXXXX", 6);
  return -1;
}

int mkstemp(char *template) { return __mkostemps(template, 0, 0); }
