#define STUB(x) printf("wasm-posix C STUB: %s\n", x);
//#define STUB(x)
char* strsignal(int sig) {
  STUB("strsignal");
  return "a signal";
}

