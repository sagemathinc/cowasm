#ifndef EXTRA_CONFIG_H
#define EXTRA_CONFIG_H

#include <sys/stat.h>
int fchmod(int fd, mode_t mode);
int fchown(int fd, uid_t owner, gid_t group);

#endif // EXTRA_CONFIG_H
