/*
This is meant to illustrate and test some things involving writing a C program
that runs using wacalc.

To build and run under WaCalc:

   make run-misc.wasm

To build and run natively:

   make run-misc.exe

*/

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <fcntl.h>

unsigned long long sum(int n) {
  unsigned long long s = 0;
  for (int i = 0; i <= n; i++) {
    s += i;
  }
  return s;
}

#include <sys/time.h>

long long time0() {
  struct timeval te;
  gettimeofday(&te, NULL);  // get current time
  long long milliseconds =
      te.tv_sec * 1000LL + te.tv_usec / 1000;  // calculate milliseconds
  // printf("milliseconds: %lld\n", milliseconds);
  return milliseconds;
}

#include <sys/stat.h>
extern char* user_from_uid(uid_t uid, int nouser);

#include <limits.h>
int main(int argc, char** argv) {
#ifdef __wacalc__
  printf("PAGE_SIZE=%d\n", PAGE_SIZE);
#endif

  for (int i = 0; i < argc; i++) {
    printf("argv[%d]=%s\n", i, argv[i]);
  }
#ifdef __wacalc__
  printf("hi %s\n", user_from_uid(500, 0));
#endif

  const char* path = "/tmp/temporary-file";

  int fd = open(path, O_RDWR | O_CREAT);
  printf("opened '%s' with fd=%d usings flags=%d\n", path, fd, O_RDWR | O_CREAT);
  if (fd == -1) {
    fprintf(stderr, "file open failed!\n");
    exit(1);
  }
  close(fd);
  unlink(path);

  int n = 10000000;
  if (argc > 1) {
    n = atoi(argv[1]);
  }
  if (n < 0) {
    fprintf(stderr, "n must be nonnegative\n");
    exit(1);
  }
  long long t0 = time0();
  unsigned long long s = sum(n);
  long long delta = time0() - t0;
  printf("sum up to %d = %lld in %lldms\n", n, s, delta);
  return 0;
}
