#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR POSIX_WASM_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
posix_wasm_dir="$(cd "$4" && pwd)"
jobs="${JOBS:-8}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "lzma" wasi-sdk "$bin_dir" "$probe_dir"

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

cd "$build_dir"
compat_dir="$probe_dir/compat"
mkdir -p "$compat_dir/sys"
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
cat >"$compat_dir/termios.h" <<'EOF'
#ifndef COWASM_LZMA_WASI_SDK_COMPAT_TERMIOS_H
#define COWASM_LZMA_WASI_SDK_COMPAT_TERMIOS_H

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
#ifndef COWASM_LZMA_WASI_SDK_COMPAT_NETDB_H
#define COWASM_LZMA_WASI_SDK_COMPAT_NETDB_H

#include <stddef.h>
#include <sys/types.h>

#ifndef EAI_NONAME
#define EAI_NONAME -2
#endif

#ifndef AF_UNSPEC
#define AF_UNSPEC 0
#endif

struct sockaddr;

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
cat >"$compat_dir/compat.c" <<'EOF'
#include <signal.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <time.h>
#include <unistd.h>

uid_t cowasm_lzma_geteuid(void) {
  return 0;
}

int cowasm_lzma_fchown(int fd, uid_t owner, gid_t group) {
  (void)fd;
  (void)owner;
  (void)group;
  return 0;
}

int cowasm_lzma_fchmod(int fd, mode_t mode) {
  (void)fd;
  (void)mode;
  return 0;
}

int cowasm_lzma_futimens(int fd, const struct timespec times[2]) {
  (void)fd;
  (void)times;
  return 0;
}

int cowasm_lzma_isatty(int fd) {
  (void)fd;
  return 0;
}

unsigned int cowasm_lzma_alarm(unsigned int seconds) {
  (void)seconds;
  return 0;
}

int cowasm_lzma_sigemptyset(sigset_t *set) {
  if (set != 0) {
    memset(set, 0, sizeof(*set));
  }
  return 0;
}

int cowasm_lzma_sigaddset(sigset_t *set, int signum) {
  (void)set;
  (void)signum;
  return 0;
}

int cowasm_lzma_sigfillset(sigset_t *set) {
  if (set != 0) {
    memset(set, 0xff, sizeof(*set));
  }
  return 0;
}

int cowasm_lzma_sigprocmask(int how, const sigset_t *set, sigset_t *oldset) {
  (void)how;
  (void)set;
  if (oldset != 0) {
    memset(oldset, 0, sizeof(*oldset));
  }
  return 0;
}

int cowasm_lzma_sigaction(int signum, const struct sigaction *act, struct sigaction *oldact) {
  (void)signum;
  (void)act;
  (void)oldact;
  return 0;
}

void cowasm_lzma_sig_ign(int signum) {
  (void)signum;
}

int cowasm_lzma_raise(int signum) {
  (void)signum;
  return 0;
}
EOF
env COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -c "$compat_dir/compat.c" -o "$probe_dir/compat.o"

CHOST=none \
AR="$bin_dir/cowasm-ar" \
RANLIB="$bin_dir/cowasm-ranlib" \
CC="$bin_dir/cowasm-cc" \
CXX="$bin_dir/cowasm-c++" \
CFLAGS="-Oz -fvisibility-main -I$compat_dir -I$posix_wasm_dir" \
COWASM_TOOLCHAIN=wasi-sdk \
  ./configure \
    --build="$(./build-aux/config.guess)" \
    --host=none \
    --prefix="$dist_dir" \
    --without-libiconv-prefix \
    --without-libintl-prefix \
    --disable-threads \
    --disable-assembler

compat_cflags='-Dgeteuid=cowasm_lzma_geteuid -Dfchown=cowasm_lzma_fchown -Dfchmod=cowasm_lzma_fchmod -Dfutimens=cowasm_lzma_futimens -Disatty=cowasm_lzma_isatty -Dalarm=cowasm_lzma_alarm -Dsigemptyset=cowasm_lzma_sigemptyset -Dsigaddset=cowasm_lzma_sigaddset -Dsigfillset=cowasm_lzma_sigfillset -Dsigprocmask=cowasm_lzma_sigprocmask -Dsigaction=cowasm_lzma_sigaction -D__SIG_IGN=cowasm_lzma_sig_ign -Draise=cowasm_lzma_raise'
printf '\nCFLAGS += %s\n' "$compat_cflags" >>src/xz/Makefile
printf '\nxz_LDADD += %s\n' "$probe_dir/compat.o" >>src/xz/Makefile
echo '#include "posix-wasm.h"' >>config.h
COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs"
COWASM_TOOLCHAIN=wasi-sdk make install

test_dir="$probe_dir/lzma-roundtrip"
mkdir -p "$test_dir"
cp Makefile "$test_dir/Makefile"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/xz" -f -c "$test_dir/Makefile" \
  >"$test_dir/Makefile.xz"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/xz" -f -d -c "$test_dir/Makefile.xz" \
  >"$test_dir/Makefile.out"
cmp Makefile "$test_dir/Makefile.out"
