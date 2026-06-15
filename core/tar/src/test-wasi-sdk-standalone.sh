#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 8 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR POSIX_WASM_DIR ZLIB_DIST_DIR BZIP2_DIST_DIR LZMA_DIST_DIR SRC_DIR" \
    >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
posix_wasm_dir="$4"
zlib_dist_dir="$5"
bzip2_dist_dir="$6"
lzma_dist_dir="$7"
src_dir="$(cd "$8" && pwd)"
jobs="${JOBS:-8}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "tar" wasi-sdk "$bin_dir" "$probe_dir"

posix_wasm_dir="$(cd "$posix_wasm_dir" && pwd)"
zlib_dist_dir="$(cd "$zlib_dist_dir" && pwd)"
bzip2_dist_dir="$(cd "$bzip2_dist_dir" && pwd)"
lzma_dist_dir="$(cd "$lzma_dist_dir" && pwd)"

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
#ifndef COWASM_TAR_WASI_SDK_COMPAT_TERMIOS_H
#define COWASM_TAR_WASI_SDK_COMPAT_TERMIOS_H

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
#define ECHO 0x00000008
#define ECHONL 0x00000040

#endif
EOF
cat >"$compat_dir/netdb.h" <<'EOF'
#ifndef COWASM_TAR_WASI_SDK_COMPAT_NETDB_H
#define COWASM_TAR_WASI_SDK_COMPAT_NETDB_H

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
cat >"$compat_dir/pwd.h" <<'EOF'
#ifndef COWASM_TAR_WASI_SDK_COMPAT_PWD_H
#define COWASM_TAR_WASI_SDK_COMPAT_PWD_H

#include <sys/types.h>

struct passwd {
  char *pw_name;
  uid_t pw_uid;
  gid_t pw_gid;
  char *pw_dir;
  char *pw_shell;
};

struct passwd *getpwnam(const char *name);
struct passwd *getpwuid(uid_t uid);

#endif
EOF
cat >"$compat_dir/grp.h" <<'EOF'
#ifndef COWASM_TAR_WASI_SDK_COMPAT_GRP_H
#define COWASM_TAR_WASI_SDK_COMPAT_GRP_H

#include <sys/types.h>

struct group {
  char *gr_name;
  gid_t gr_gid;
  char **gr_mem;
};

struct group *getgrnam(const char *name);
struct group *getgrgid(gid_t gid);

#endif
EOF
cat >"$compat_dir/wasi_sdk_standalone_config.h" <<'EOF'
#ifndef COWASM_TAR_WASI_SDK_BZIP2_CONFIG_H
#define COWASM_TAR_WASI_SDK_BZIP2_CONFIG_H
#endif
EOF
cat >"$probe_dir/compat.c" <<'EOF'
#include <errno.h>
#include <fcntl.h>
#include <grp.h>
#include <pwd.h>
#include <signal.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <termios.h>
#include <unistd.h>

int fchdir(int fd) {
  (void)fd;
  return 0;
}

int dup(int fd) {
  (void)fd;
  return open(".", O_RDONLY);
}

uid_t geteuid(void) {
  return 0;
}

uid_t getuid(void) {
  return 0;
}

gid_t getgid(void) {
  return 0;
}

pid_t getpid(void) {
  return 1;
}

int kill(pid_t pid, int sig) {
  (void)pid;
  (void)sig;
  return 0;
}

mode_t umask(mode_t mask) {
  (void)mask;
  return 0;
}

pid_t waitpid(pid_t pid, int *status, int options) {
  (void)pid;
  (void)status;
  (void)options;
  errno = ECHILD;
  return -1;
}

int tcgetattr(int fd, struct termios *termios_p) {
  (void)fd;
  (void)termios_p;
  errno = ENOTTY;
  return -1;
}

int tcsetattr(int fd, int optional_actions, const struct termios *termios_p) {
  (void)fd;
  (void)optional_actions;
  (void)termios_p;
  return 0;
}

int sigemptyset(sigset_t *set) {
  (void)set;
  return 0;
}

int sigaction(int signum, const struct sigaction *act, struct sigaction *oldact) {
  (void)signum;
  (void)act;
  (void)oldact;
  return 0;
}

struct passwd *getpwnam(const char *name) {
  (void)name;
  return 0;
}

struct passwd *getpwuid(uid_t uid) {
  (void)uid;
  return 0;
}

struct group *getgrnam(const char *name) {
  (void)name;
  return 0;
}

struct group *getgrgid(gid_t gid) {
  (void)gid;
  return 0;
}

int __archive_create_child(const char *cmd, int *child_stdin, int *child_stdout,
                           int *child_stderr) {
  (void)cmd;
  (void)child_stdin;
  (void)child_stdout;
  (void)child_stderr;
  errno = ENOSYS;
  return -1;
}

void __archive_check_child(int in, int out) {
  (void)in;
  (void)out;
}
EOF

common_cppflags="-I$compat_dir -I$posix_wasm_dir -I$zlib_dist_dir/include -I$bzip2_dist_dir/include -I$lzma_dist_dir/include"
COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  $common_cppflags \
  -c "$probe_dir/compat.c" -o "$probe_dir/compat.o"

CC="$bin_dir/cowasm-cc" \
AR="$bin_dir/cowasm-ar" \
RANLIB="$bin_dir/cowasm-ranlib" \
CPPFLAGS="$common_cppflags" \
CFLAGS="-Oz $common_cppflags" \
LDFLAGS="-L$zlib_dist_dir/lib -lz -L$bzip2_dist_dir/lib -lbz2 -L$lzma_dist_dir/lib -llzma" \
COWASM_TOOLCHAIN=wasi-sdk \
  ./configure \
    --host=none \
    --program-transform-name='s/bsd//' \
    --prefix="$dist_dir" \
    --without-openssl \
    --without-xml2 \
    --without-expat \
    --without-libb2 \
    --without-iconv \
    --without-libiconv-prefix \
    --without-zstd \
    --without-cng \
    --without-lz4

cat "$src_dir/config.h" >>config.h
printf '\n' >>config.h
cat >>config.h <<'EOF'
/* These probes compile with wasi-sdk but are not implemented by the runner. */
#define HAVE_FCHDIR 1
#undef HAVE_FSTATVFS
#undef HAVE_STATVFS
EOF
COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs" libarchive.la libarchive_fe.la
COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs" \
  LIBS="$probe_dir/compat.o" \
  bsdtar bsdcpio bsdcat
COWASM_TOOLCHAIN=wasi-sdk make install

cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/tar" -h | grep "bsdtar 3.6.1"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/cat" --version | grep "bsdcat 3.6.1"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/cpio" --version | grep "bsdcpio 3.6.1"

test_dir="$probe_dir/tar-roundtrip"
mkdir -p "$test_dir/input"
printf 'CoWasm wasi-sdk tar smoke\n' >"$test_dir/input/message.txt"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/tar" \
  -cf "$test_dir/archive.tar" -C "$test_dir/input" message.txt
mkdir "$test_dir/output"
cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/tar" \
  --no-same-owner -xf "$test_dir/archive.tar" -C "$test_dir/output"
cmp "$test_dir/input/message.txt" "$test_dir/output/message.txt"
