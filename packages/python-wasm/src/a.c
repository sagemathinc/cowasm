// core approach
// zig cc -target wasm32-wasi a.c src/core.wasm.o -o a.wasm

// shared approach
// zig-fPIC cc -c a.c -o a.o && zig wasm-ld --experimental-pic -shared a.o -o
// a.so

#include <stdio.h>

unsigned long long sum(int n) {
  unsigned long long s = 0;
  for (int i = 0; i <= 1000000; i++) {
    s += i;
  }
  return s;
}

int main(int argc, char** argv) {
  printf("%s: argc=%d\n", argv[0], argc);
  printf("sum up to 10**6 = %lld\n", sum(1000000));
  return 0;
}
