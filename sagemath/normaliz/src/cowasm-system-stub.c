#include <errno.h>

int system(const char *command) {
  (void)command;
  errno = ENOSYS;
  return -1;
}
