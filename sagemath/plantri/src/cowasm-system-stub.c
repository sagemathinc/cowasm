#include <errno.h>
#include <stdlib.h>

int system(const char *command) {
  (void)command;
  errno = ENOSYS;
  return -1;
}
