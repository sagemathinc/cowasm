#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 5 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR LIBEDIT_DIST_DIR TERMCAP_DIST_DIR" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
libedit_dist_dir="$(cd "$4" && pwd)"
termcap_dist_dir="$(cd "$5" && pwd)"
jobs="${JOBS:-8}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$script_dir/../../build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "dash" wasi-sdk "$bin_dir" "$probe_dir"

compat_dir="$probe_dir/compat"
mkdir -p "$compat_dir/sys"
cat >"$compat_dir/sys/wait.h" <<'EOF'
#ifndef COWASM_DASH_COMPAT_SYS_WAIT_H
#define COWASM_DASH_COMPAT_SYS_WAIT_H

#include <sys/types.h>

#define WNOHANG 1
#define WUNTRACED 2
#define WEXITSTATUS(s) (((s)&0xff00) >> 8)
#define WTERMSIG(s) ((s)&0x7f)
#define WSTOPSIG(s) WEXITSTATUS(s)
#define WIFEXITED(s) (!WTERMSIG(s))
#define WIFSTOPPED(s) ((short)((((s)&0xffff) * 0x10001) >> 8) > 0x7f00)
#define WIFSIGNALED(s) (((s)&0xffff) - 1U < 0xffu)

pid_t waitpid(pid_t pid, int *status, int options);

#endif
EOF

cat >"$probe_dir/cowasm-dash-compat.h" <<'EOF'
#ifndef COWASM_DASH_COMPAT_H
#define COWASM_DASH_COMPAT_H

#include <signal.h>
#include <sys/types.h>
#include <unistd.h>

#ifndef SIG_SETMASK
#define SIG_SETMASK 2
#endif

struct sigaction {
  void (*sa_handler)(int);
  sigset_t sa_mask;
  int sa_flags;
};

int sigemptyset(sigset_t *set);
int sigfillset(sigset_t *set);
int sigprocmask(int how, const sigset_t *set, sigset_t *oldset);
int sigaction(int sig, const struct sigaction *act, struct sigaction *oldact);
int dup(int oldfd);
int dup2(int oldfd, int newfd);
int pipe(int pipefd[2]);
int execve(const char *path, char *const argv[], char *const envp[]);
int kill(pid_t pid, int sig);
pid_t waitpid(pid_t pid, int *status, int options);
int cowasm_vforkexec(char **argv, const char *path);
char *strsignal(int sig);
int mkstemp(char *tmpl);
pid_t getppid(void);
uid_t getuid(void);
uid_t geteuid(void);
gid_t getgid(void);
gid_t getegid(void);
pid_t fork(void);
pid_t vfork(void);
int sigsuspend(const sigset_t *mask);
mode_t umask(mode_t mask);

#endif
EOF

cat >"$probe_dir/cowasm-dash-stubs.c" <<'EOF'
#include <errno.h>
#include <stdarg.h>
#include <signal.h>
#include <sys/types.h>
#include <time.h>
#include <unistd.h>

#include "cowasm-dash-compat.h"

struct tms {
  clock_t tms_utime;
  clock_t tms_stime;
  clock_t tms_cutime;
  clock_t tms_cstime;
};

int cowasm_vforkexec(char **argv, const char *path) {
  (void)argv;
  (void)path;
  errno = ENOSYS;
  return 127;
}

int dup(int oldfd) {
  (void)oldfd;
  errno = ENOSYS;
  return -1;
}

int dup2(int oldfd, int newfd) {
  (void)oldfd;
  (void)newfd;
  errno = ENOSYS;
  return -1;
}

int pipe(int pipefd[2]) {
  (void)pipefd;
  errno = ENOSYS;
  return -1;
}

int execve(const char *path, char *const argv[], char *const envp[]) {
  (void)path;
  (void)argv;
  (void)envp;
  errno = ENOSYS;
  return -1;
}

int kill(pid_t pid, int sig) {
  (void)pid;
  (void)sig;
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

char *strsignal(int sig) {
  (void)sig;
  return "signal";
}

int mkstemp(char *tmpl) {
  (void)tmpl;
  errno = ENOSYS;
  return -1;
}

int sigemptyset(sigset_t *set) {
  if (set != 0) *set = 0;
  return 0;
}

int sigaddset(sigset_t *set, int sig) {
  (void)sig;
  if (set != 0) *set = 0;
  return 0;
}

int sigfillset(sigset_t *set) {
  if (set != 0) *set = (sigset_t)~0;
  return 0;
}

int sigprocmask(int how, const sigset_t *set, sigset_t *oldset) {
  (void)how;
  (void)set;
  if (oldset != 0) *oldset = 0;
  return 0;
}

int sigaction(int sig, const struct sigaction *act, struct sigaction *oldact) {
  (void)sig;
  (void)act;
  if (oldact != 0) {
    oldact->sa_handler = SIG_DFL;
    oldact->sa_mask = 0;
    oldact->sa_flags = 0;
  }
  return 0;
}

void (*signal(int sig, void (*func)(int)))(int) {
  (void)sig;
  return func;
}

int raise(int sig) {
  (void)sig;
  return 0;
}

void __SIG_IGN(int sig) {
  (void)sig;
}

clock_t times(struct tms *buf) {
  if (buf != 0) {
    buf->tms_utime = 0;
    buf->tms_stime = 0;
    buf->tms_cutime = 0;
    buf->tms_cstime = 0;
  }
  return 0;
}

int execlp(const char *file, const char *arg, ...) {
  (void)file;
  (void)arg;
  errno = ENOSYS;
  return -1;
}

pid_t getpid(void) {
  return 1;
}

pid_t getppid(void) {
  return 1;
}

uid_t getuid(void) {
  return 0;
}

uid_t geteuid(void) {
  return 0;
}

gid_t getgid(void) {
  return 0;
}

gid_t getegid(void) {
  return 0;
}

pid_t fork(void) {
  errno = ENOSYS;
  return -1;
}

pid_t vfork(void) {
  errno = ENOSYS;
  return -1;
}

int sigsuspend(const sigset_t *mask) {
  (void)mask;
  errno = ENOSYS;
  return -1;
}

mode_t umask(mode_t mask) {
  (void)mask;
  return 0;
}
EOF

rm -rf "$dist_dir"
mkdir -p "$dist_dir"

cd "$build_dir"

COWASM_TOOLCHAIN=wasi-sdk "$bin_dir/cowasm-cc" \
  -Oz \
  -c "$probe_dir/cowasm-dash-stubs.c" \
  -o "$probe_dir/cowasm-dash-stubs.o"

CONFIG_SITE="$build_dir/config.site" \
RANLIB="$bin_dir/cowasm-ranlib" \
AR="$bin_dir/cowasm-ar" \
CC="$bin_dir/cowasm-cc" \
CC_FOR_BUILD="cc" \
CFLAGS="-Oz -fvisibility-main -DJOBS=0 -I$compat_dir -I$libedit_dist_dir/include" \
LDFLAGS="$probe_dir/cowasm-dash-stubs.o -L$libedit_dist_dir/lib -ledit -L$termcap_dist_dir/lib -ltermcap" \
COWASM_TOOLCHAIN=wasi-sdk \
  ./configure \
    --with-libedit \
    --prefix="$dist_dir" \
    --host=none

perl -0pi -e 's@/\* #undef HAVE_KILLPG \*/@#define HAVE_KILLPG 1@' config.h
perl -0pi -e 's@/\* #undef HAVE_STRSIGNAL \*/@#define HAVE_STRSIGNAL 1@' config.h
cp "$probe_dir/cowasm-dash-compat.h" src/
perl -0pi -e 's@(#include <sys/types.h>\n)@$1#include "cowasm-dash-compat.h"\n@' src/system.h
perl -0pi -e 's@(#include <sys/types.h>\n)@$1#include "cowasm-dash-compat.h"\n@' src/eval.c
perl -0pi -e 's@(#include <unistd.h>\n)@$1#include "cowasm-dash-compat.h"\n@' src/histedit.c
perl -0pi -e 's@(#include <unistd.h>\n)@$1#include "cowasm-dash-compat.h"\n@' src/main.c
perl -0pi -e 's@(#include <unistd.h>\n)@$1#include "cowasm-dash-compat.h"\n@' src/redir.c
perl -0pi -e 's@(#include <unistd.h>\n)@$1#include "cowasm-dash-compat.h"\n@' src/miscbltin.c
perl -0pi -e 's@(#include <signal.h>\n)@$1#include "cowasm-dash-compat.h"\n@' src/trap.c
perl -0pi -e 's@(#include <unistd.h>\n)@$1#include "../cowasm-dash-compat.h"\n@' src/bltin/test.c
cat >>config.h <<'EOF'
#ifndef _PATH_TMP
#define _PATH_TMP "/tmp/"
#endif
EOF
perl -0pi -e 's/wait3\(status, flags, NULL\)/waitpid(-1, status, flags)/g' src/jobs.c

COWASM_TOOLCHAIN=wasi-sdk make -C src init.c
perl -0pi -e 's@(#include <unistd.h>\n)@$1#include "cowasm-dash-compat.h"\n@' src/init.c

COWASM_TOOLCHAIN=wasi-sdk make -j"$jobs" install
ln -sf "$dist_dir/bin/dash" "$dist_dir/bin/sh"

arithmetic_output="$(
  cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/dash" -c \
    'echo $((389*5077))'
)"
printf '%s\n' "$arithmetic_output" | grep 1974953

syntax_output="$(
  cowasm_clang_standalone_run_wasi "$bin_dir" "$dist_dir/bin/dash" -c \
    "); echo 'I am still alive'"
)"
printf '%s\n' "$syntax_output" | grep alive
