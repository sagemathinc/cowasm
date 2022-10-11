// zig cc -target wasm32-wasi -Oz a.c -o a.wasm

// zig cc -Oz a.c -o a.exe && time ./a.exe

// shared approach
// zig-fPIC cc -c a.c -o a.o && zig wasm-ld --experimental-pic -shared a.o -o
// a.so

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

/*
zig wasm-ld --error-limit=0 -O2 -s --stack-first --export-dynamic -z stack-size=1048576 --allow-undefined -o a.wasm /Users/wstein/build/cocalc/src/data/projects/2c9318d1-4f8b-4910-8da7-68a965514c95/.cache/zig/o/19455a81af1d577095ab969d4bb235f4/crt1-command.o /Users/wstein/build/cocalc/src/data/projects/2c9318d1-4f8b-4910-8da7-68a965514c95/.cache/zig/o/05c39cfef9dda29a79d3d9258afe0aa3/libc.a ./a.o /Users/wstein/build/cocalc/src/data/projects/2c9318d1-4f8b-4910-8da7-68a965514c95/.cache/zig/o/16da3be53de3230043688a5b4fec38fc/libcompiler_rt.a
*/

// extern void keepalive(size_t size);
// WASM_EXPORT(keepalive, keepalive)

__attribute__((visibility("default"))) void* c_malloc(size_t n) {
  return malloc(n);
}
__attribute__((visibility("default"))) void c_free(void* p) { free(p); }

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
  printf("%p\n",c_malloc(0));
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
