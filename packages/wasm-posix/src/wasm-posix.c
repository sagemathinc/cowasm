#define STUB(x) printf("STUB: %s\n", x);
//#define STUB(x)
char* strsignal(int sig) {
  STUB("strsignal");
  return "a signal";
}