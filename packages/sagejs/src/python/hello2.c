// zig cc -target wasm32-wasi hello2.c -dynamic -lc -o hello2.wasm

#include <stdio.h>
#include <stdlib.h>
extern void hi() {
  const char* s = getenv("HOME");
  printf("HOME=%s\n", s ? s : "");
  printf("reading file...\n");
  printf("-----\n");
  int c;
  FILE* file;
  file = fopen("/tmp/hello2.c", "r");
  if (file) {
    while ((c = getc(file)) != EOF) putchar(c);
    fclose(file);
  } else {
    printf("FAILED to open file\n");
  }
  printf("\n-----\n");
}

int main(void) { hi(); }