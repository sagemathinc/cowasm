#include <stdio.h>

extern void *dlopen(const char *filename, int flags);
extern void *dlsym(void *handle, const char *symbol);

typedef int (*mpfr_side_parse_state_t)(void);

int main(void) {
  void *handle = dlopen("./mpfr-side.so", 2);
  if (handle == NULL) {
    fputs("mpfr-side-dlopen-failed\n", stderr);
    return 1;
  }

  mpfr_side_parse_state_t parse_state =
      (mpfr_side_parse_state_t)dlsym(handle, "mpfr_side_parse_state");
  if (parse_state == NULL) {
    fputs("mpfr-side-dlsym-failed\n", stderr);
    return 1;
  }

  int status = parse_state();
  if (status != 0) {
    fprintf(stderr, "mpfr-side-parse-state-failed stage=%d\n", status);
    return 1;
  }

  puts("mpfr-side-ok parse-state");
  return 0;
}
