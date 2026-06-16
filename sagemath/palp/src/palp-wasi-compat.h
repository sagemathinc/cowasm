#ifndef COWASM_PALP_WASI_COMPAT_H
#define COWASM_PALP_WASI_COMPAT_H

#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static unsigned int cowasm_palp_tmp_counter = 0;

static int cowasm_palp_mkstemp(char *template) {
  size_t len = strlen(template);
  if (len < 6 || strcmp(template + len - 6, "XXXXXX") != 0) {
    errno = EINVAL;
    return -1;
  }

  for (unsigned int attempt = 0; attempt < 1000; attempt++) {
    snprintf(template + len - 6, 7, "%06u",
             cowasm_palp_tmp_counter++ % 1000000u);
    int fd = open(template, O_RDWR | O_CREAT | O_EXCL, 0600);
    if (fd >= 0) {
      return fd;
    }
    if (errno != EEXIST) {
      return -1;
    }
  }

  errno = EEXIST;
  return -1;
}

static FILE *cowasm_palp_tmpfile(void) {
  char filename[] = ".cowasm-palp-tmp-XXXXXX";
  int fd = cowasm_palp_mkstemp(filename);
  if (fd < 0) {
    return NULL;
  }
  unlink(filename);
  FILE *file = fdopen(fd, "w+");
  if (file == NULL) {
    close(fd);
  }
  return file;
}

static int cowasm_palp_system(const char *command) {
  (void)command;
  errno = ENOSYS;
  return 127;
}

#define mkstemp cowasm_palp_mkstemp
#define tmpfile cowasm_palp_tmpfile
#define system cowasm_palp_system

#endif
