#ifndef COWASM_LIBEDIT_STANDALONE_SYS_WAIT_H
#define COWASM_LIBEDIT_STANDALONE_SYS_WAIT_H

#include <errno.h>
#include <sys/types.h>

typedef enum {
  P_ALL = 0,
  P_PID = 1,
  P_PGID = 2,
  P_PIDFD = 3
} idtype_t;

#define WNOHANG 1
#define WUNTRACED 2
#define WSTOPPED 2
#define WEXITED 4
#define WCONTINUED 8
#define WNOWAIT 0x1000000

#define WEXITSTATUS(s) (((s) & 0xff00) >> 8)
#define WTERMSIG(s) ((s) & 0x7f)
#define WSTOPSIG(s) WEXITSTATUS(s)
#define WCOREDUMP(s) ((s) & 0x80)
#define WIFEXITED(s) (!WTERMSIG(s))
#define WIFSTOPPED(s) ((short)((((s) & 0xffff) * 0x10001) >> 8) > 0x7f00)
#define WIFSIGNALED(s) (((s) & 0xffff) - 1U < 0xffu)
#define WIFCONTINUED(s) ((s) == 0xffff)

static inline pid_t wait(int *status) {
  (void)status;
  errno = ENOSYS;
  return (pid_t)-1;
}

static inline pid_t waitpid(pid_t pid, int *status, int options) {
  (void)pid;
  (void)status;
  (void)options;
  errno = ENOSYS;
  return (pid_t)-1;
}

#endif
