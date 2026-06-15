#ifndef EXTRA_CONFIG_H
#define EXTRA_CONFIG_H

#include <sys/stat.h>
#include <unistd.h>
int fchmod(int fd, mode_t mode);
int fchown(int fd, uid_t owner, gid_t group);

#ifdef __wasm32__
#define isatty(fd) (0)
#endif

#endif  // EXTRA_CONFIG_H
