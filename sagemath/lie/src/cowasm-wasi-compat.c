#include <string.h>
#include <time.h>

char *tmpnam(char *s) {
  static char name[] = "/tmp/cowasm-lie.tmp";

  if (s != 0) {
    strcpy(s, name);
    return s;
  }
  return name;
}

int system(const char *command) {
  (void)command;
  return 0;
}

clock_t clock(void) { return (clock_t)0; }
