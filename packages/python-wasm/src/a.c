// zig cc -target wasm32-wasi -Oz a.c -o a.wasm

// zig cc -Oz a.c -o a.exe && time ./a.exe

// shared approach
// zig-fPIC cc -c a.c -o a.o && zig wasm-ld --experimental-pic -shared a.o -o
// a.so

#include <stdio.h>
#include <stdlib.h>

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

int main(int argc, char** argv) {

  for (int i = 0; i < argc; i++) {
    printf("argv[%d]=%s\n", i, argv[i]);
  }
  printf("hi %s\n", user_from_uid(500, 0));
  int n = 10000000;
  if (argc > 1) {
    n = atoi(argv[1]);
  }
  long long t0 = time0();
  unsigned long long s = sum(n);
  long long delta = time0() - t0;
  printf("sum up to %d = %lld in %lldms\n", n, s, delta);
  return 0;
}
