#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 5 ]; then
  echo "usage: test-clang-standalone.sh BUILD_DIR DIST_DIR BIN_DIR POSIX_WASM_DIR SRC_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
posix_wasm_dir="$(cd "$4" && pwd)"
src_dir="$(cd "$5" && pwd)"
jobs="${JOBS:-8}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_clang_standalone_probe "openssl" "$bin_dir" "$probe_dir"

compat_dir="$probe_dir/compat"
mkdir -p "$compat_dir/sys"

cat >"$compat_dir/sys/wait.h" <<'EOF'
#ifndef _SYS_WAIT_H
#define _SYS_WAIT_H

#include <sys/types.h>

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
#ifndef COWASM_OPENSSL_COMPAT_TERMIOS_H
#define COWASM_OPENSSL_COMPAT_TERMIOS_H

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
#define ECHO 0000010

#endif
EOF

cat >"$compat_dir/netdb.h" <<'EOF'
#ifndef COWASM_OPENSSL_COMPAT_NETDB_H
#define COWASM_OPENSSL_COMPAT_NETDB_H

#include <stddef.h>

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

cat >"$compat_dir/cowasm-openssl-compat.h" <<'EOF'
#ifndef COWASM_OPENSSL_COMPAT_H
#define COWASM_OPENSSL_COMPAT_H

#include <sys/types.h>

static uid_t cowasm_openssl_getuid(void) { return 0; }
static uid_t cowasm_openssl_geteuid(void) { return 0; }
static gid_t cowasm_openssl_getgid(void) { return 0; }
static gid_t cowasm_openssl_getegid(void) { return 0; }

#define getuid cowasm_openssl_getuid
#define geteuid cowasm_openssl_geteuid
#define getgid cowasm_openssl_getgid
#define getegid cowasm_openssl_getegid

#endif
EOF

cat >"$probe_dir/cowasm-openssl-stubs.c" <<'EOF'
#include <errno.h>
#include <string.h>
#include <sys/types.h>
#include <termios.h>
#include <unistd.h>

pid_t fork(void) {
  errno = ENOSYS;
  return -1;
}

int pipe(int pipefd[2]) {
  (void)pipefd;
  errno = ENOSYS;
  return -1;
}

int dup(int oldfd) {
  (void)oldfd;
  errno = ENOSYS;
  return -1;
}

pid_t wait(int *status) {
  (void)status;
  errno = ENOSYS;
  return -1;
}

unsigned int alarm(unsigned int seconds) {
  (void)seconds;
  return 0;
}

int tcgetattr(int fd, struct termios *tio) {
  (void)fd;
  if (tio != 0) {
    memset(tio, 0, sizeof(*tio));
  }
  return 0;
}

int tcsetattr(int fd, int act, const struct termios *tio) {
  (void)fd;
  (void)act;
  (void)tio;
  return 0;
}
EOF

cflags=(
  -Oz
  -fvisibility-main
  -DNO_SYSLOG
  -D_WASI_EMULATED_MMAN
  -D_WASI_EMULATED_GETPID
  -include "$compat_dir/cowasm-openssl-compat.h"
  -I"$compat_dir"
  -I"$posix_wasm_dir"
)
ldlibs=(
  "$probe_dir/cowasm-openssl-stubs.o"
  -L"$posix_wasm_dir"
  -lposix
  -lwasi-emulated-mman
  -lwasi-emulated-getpid
  -lwasi-emulated-signal
  -lwasi-emulated-process-clocks
)

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

COWASM_TOOLCHAIN=clang "$bin_dir/cowasm-cc" \
  -Oz \
  -D_WASI_EMULATED_MMAN \
  -D_WASI_EMULATED_GETPID \
  -I"$compat_dir" \
  -c "$probe_dir/cowasm-openssl-stubs.c" \
  -o "$probe_dir/cowasm-openssl-stubs.o"

cd "$build_dir"
COWASM_TOOLCHAIN=clang \
CC="$bin_dir/cowasm-cc" \
CFLAGS="${cflags[*]}" \
LDFLAGS="-lwasi-emulated-mman -lwasi-emulated-getpid" \
AR="$bin_dir/cowasm-ar" \
RANLIB="$bin_dir/cowasm-ranlib" \
  ./Configure --prefix="$dist_dir" gcc \
    no-async no-threads no-shared no-tests no-asm no-afalgeng no-sock

COWASM_TOOLCHAIN=clang make -j"$jobs" build_sw BIN_EX_LIBS="${ldlibs[*]}"
COWASM_TOOLCHAIN=clang make -j"$jobs" install_sw BIN_EX_LIBS="${ldlibs[*]}"

openssl_bin="$dist_dir/bin/openssl"
ln -sf openssl "$openssl_bin.wasm"

printf 'foo\n' | cowasm_clang_standalone_run_wasi "$bin_dir" "$openssl_bin" md5 \
  >"$probe_dir/openssl-md5.out"
grep -F "MD5(stdin)= d3b07384d113edec49eaa6238ad5ff00" "$probe_dir/openssl-md5.out"
