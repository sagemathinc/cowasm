#define STUB(x) printf("posix-wasm C STUB: %s\n", x);
//#define STUB(x)
char* strsignal(int sig) {
  STUB("strsignal");
  return "a signal";
}

