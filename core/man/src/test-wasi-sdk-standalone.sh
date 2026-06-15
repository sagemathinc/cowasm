#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 6 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR POSIX_WASM_DIR ZLIB_DIST_DIR SRC_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
posix_wasm_dir="$(cd "$4" && pwd)"
zlib_dist_dir="$(cd "$5" && pwd)"
src_dir="$(cd "$6" && pwd)"
jobs="${JOBS:-8}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "man" wasi-sdk "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir/bin"

cd "$build_dir"
compat_dir="$probe_dir/compat"
mkdir -p "$compat_dir/arpa" "$compat_dir/sys"
cat >"$compat_dir/sys/wait.h" <<'EOF'
#ifndef _SYS_WAIT_H
#define _SYS_WAIT_H

#include <sys/types.h>

#define WNOHANG 1
#define WUNTRACED 2
#define WSTOPPED 2
#define WEXITED 4
#define WCONTINUED 8
#define WNOWAIT 0x1000000

typedef enum { P_ALL = 0, P_PID = 1, P_PGID = 2, P_PIDFD = 3 } idtype_t;

#define WEXITSTATUS(s) (((s)&0xff00) >> 8)
#define WTERMSIG(s) ((s)&0x7f)
#define WSTOPSIG(s) WEXITSTATUS(s)
#define WIFEXITED(s) (!WTERMSIG(s))
#define WIFSTOPPED(s) ((short)((((s)&0xffff) * 0x10001) >> 8) > 0x7f00)
#define WIFSIGNALED(s) (((s)&0xffff) - 1U < 0xffu)

pid_t wait(int *status);
pid_t waitpid(pid_t pid, int *status, int options);

#endif
EOF
cat >"$compat_dir/sys/ioctl.h" <<'EOF'
#ifndef COWASM_MAN_COMPAT_SYS_IOCTL_H
#define COWASM_MAN_COMPAT_SYS_IOCTL_H

struct winsize {
  unsigned short ws_row;
  unsigned short ws_col;
  unsigned short ws_xpixel;
  unsigned short ws_ypixel;
};

#define TIOCGWINSZ 0x5413

int ioctl(int fd, unsigned long request, ...);

#endif
EOF
cat >"$compat_dir/termios.h" <<'EOF'
#ifndef COWASM_MAN_COMPAT_TERMIOS_H
#define COWASM_MAN_COMPAT_TERMIOS_H

typedef unsigned char cc_t;
typedef unsigned int speed_t;
typedef unsigned int tcflag_t;

#define NCCS 32

struct termios {
  tcflag_t c_iflag;
  tcflag_t c_oflag;
  tcflag_t c_cflag;
  tcflag_t c_lflag;
  cc_t c_cc[NCCS];
  speed_t c_ispeed;
  speed_t c_ospeed;
};

#define TCSANOW 0
#define TCSADRAIN 1
#define TCSAFLUSH 2

#endif
EOF
cat >"$compat_dir/netdb.h" <<'EOF'
#ifndef COWASM_MAN_COMPAT_NETDB_H
#define COWASM_MAN_COMPAT_NETDB_H

#include <stddef.h>

#ifndef EAI_NONAME
#define EAI_NONAME -2
#endif

#ifndef AF_UNSPEC
#define AF_UNSPEC 0
#endif

struct sockaddr;
#ifndef COWASM_MAN_COMPAT_IN_ADDR
#define COWASM_MAN_COMPAT_IN_ADDR
struct in_addr {
  unsigned long s_addr;
};
#endif

struct addrinfo {
  int ai_flags;
  int ai_family;
  int ai_socktype;
  int ai_protocol;
  socklen_t ai_addrlen;
  struct sockaddr *ai_addr;
  char *ai_canonname;
  struct addrinfo *ai_next;
};

static int getaddrinfo(const char *node, const char *service,
                       const struct addrinfo *hints, struct addrinfo **res) {
  (void)node;
  (void)service;
  (void)hints;
  *res = 0;
  return EAI_NONAME;
}

static void freeaddrinfo(struct addrinfo *res) {
  (void)res;
}

static const char *gai_strerror(int errcode) {
  (void)errcode;
  return "address lookup is not available in this standalone smoke";
}

#endif
EOF
cat >"$compat_dir/arpa/inet.h" <<'EOF'
#ifndef COWASM_MAN_COMPAT_ARPA_INET_H
#define COWASM_MAN_COMPAT_ARPA_INET_H

#include <stdint.h>

#ifndef COWASM_MAN_COMPAT_IN_ADDR
#define COWASM_MAN_COMPAT_IN_ADDR
struct in_addr {
  uint32_t s_addr;
};
#endif

static inline uint16_t htons(uint16_t value) {
  return (uint16_t)((value << 8) | (value >> 8));
}

static inline uint16_t ntohs(uint16_t value) {
  return htons(value);
}

static inline uint32_t htonl(uint32_t value) {
  return __builtin_bswap32(value);
}

static inline uint32_t ntohl(uint32_t value) {
  return htonl(value);
}

char *inet_ntoa(struct in_addr in);

#endif
EOF
cp "$src_dir/config.h" "$src_dir/Makefile.local" .
perl -0pi -e 's/^#define (be32toh|htobe32) .*\n//mg' config.h
cat >>config.h <<'EOF'
#undef HAVE_PROGNAME
#define HAVE_PROGNAME 0
EOF
cat >>Makefile.local <<'EOF'
MANDOC_COBJS += compat_err.o
EOF

cat >"$probe_dir/cowasm-man-stubs.c" <<'EOF'
#include "config.h"

#include <errno.h>
#include <limits.h>
#include <stddef.h>
#include <stdlib.h>
#include <string.h>
#include <sys/types.h>
#include <unistd.h>

static const char *cowasm_man_progname = "man";

void __SIG_IGN(int sig) {
  (void)sig;
}

int sigfillset(sigset_t *set) {
  if (set != NULL) *set = (sigset_t)~0;
  return 0;
}

int sigemptyset(sigset_t *set) {
  if (set != NULL) *set = 0;
  return 0;
}

int sigaction(int signum, const struct sigaction *act,
              struct sigaction *oldact) {
  (void)signum;
  (void)act;
  if (oldact != NULL) memset(oldact, 0, sizeof(*oldact));
  return 0;
}

int sigprocmask(int how, const sigset_t *set, sigset_t *oldset) {
  (void)how;
  (void)set;
  if (oldset != NULL) *oldset = 0;
  return 0;
}

int dup(int oldfd) {
  return oldfd;
}

int dup2(int oldfd, int newfd) {
  (void)oldfd;
  return newfd;
}

int mkstemps(char *path, int suffixlen) {
  (void)path;
  (void)suffixlen;
  errno = ENOSYS;
  return -1;
}

int mkstemp(char *path) {
  return mkstemps(path, 0);
}

char *mkdtemp(char *templ) {
  (void)templ;
  errno = ENOSYS;
  return NULL;
}

int fchdir(int fd) {
  (void)fd;
  errno = ENOSYS;
  return -1;
}

long long strtonum(const char *nptr, long long minval, long long maxval,
                   const char **errstr) {
  char *endptr = NULL;
  long long value;

  errno = 0;
  value = strtoll(nptr, &endptr, 10);
  if (errstr != NULL) *errstr = NULL;
  if (nptr == endptr || (endptr != NULL && *endptr != '\0')) {
    if (errstr != NULL) *errstr = "invalid";
    errno = EINVAL;
    return 0;
  }
  if ((value == LLONG_MIN || value == LLONG_MAX) && errno == ERANGE) {
    if (errstr != NULL) *errstr = "invalid";
    return 0;
  }
  if (value < minval) {
    if (errstr != NULL) *errstr = "too small";
    errno = ERANGE;
    return 0;
  }
  if (value > maxval) {
    if (errstr != NULL) *errstr = "too large";
    errno = ERANGE;
    return 0;
  }
  return value;
}

int kill(pid_t pid, int sig) {
  (void)pid;
  (void)sig;
  return 0;
}

pid_t tcgetpgrp(int fd) {
  (void)fd;
  return 1;
}

int tcsetpgrp(int fd, pid_t pgrp) {
  (void)fd;
  (void)pgrp;
  return 0;
}

pid_t getpgid(pid_t pid) {
  return pid == 0 ? 1 : pid;
}

pid_t getppid(void) {
  return 1;
}

pid_t fork(void) {
  errno = ENOSYS;
  return -1;
}

pid_t waitpid(pid_t pid, int *status, int options) {
  (void)pid;
  (void)status;
  (void)options;
  errno = ECHILD;
  return -1;
}

int execvp(const char *file, char *const argv[]) {
  (void)file;
  (void)argv;
  errno = ENOSYS;
  return -1;
}

pid_t setsid(void) {
  return 1;
}

int setpgid(pid_t pid, pid_t pgid) {
  (void)pid;
  (void)pgid;
  return 0;
}

const char *getprogname(void) {
  return cowasm_man_progname;
}

void setprogname(const char *progname) {
  if (progname != NULL) cowasm_man_progname = progname;
}
EOF

wasi_sdk_cflags="-fvisibility-main -D_WASI_EMULATED_GETPID -D_WASI_EMULATED_MMAN -I$compat_dir -I$posix_wasm_dir -I$zlib_dist_dir/include -Oz"
COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -I"$build_dir" $wasi_sdk_cflags \
  -c "$probe_dir/cowasm-man-stubs.c" \
  -o "$probe_dir/cowasm-man-stubs.o"

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs" \
  AR="$bin_dir/cowasm-ar" \
  CC="$bin_dir/cowasm-cc" \
  CFLAGS="$wasi_sdk_cflags" \
  LDADD="$probe_dir/cowasm-man-stubs.o -L$zlib_dist_dir/lib -lz -lwasi-emulated-getpid -lwasi-emulated-mman" \
  PREFIX="$dist_dir" \
  man

cp mandoc "$dist_dir/bin/man"
cp mandoc "$dist_dir/bin/mandoc"

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/mandoc" "$build_dir/man.1" |
  grep "display manual pages"
