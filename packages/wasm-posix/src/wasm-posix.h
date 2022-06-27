#ifndef WASMPOSIX
#define WASMPOSIX

#include <sys/types.h>

#define GRND_NONBLOCK 0x0001
#define GRND_RANDOM 0x0002
#define GRND_INSECURE 0x0004

ssize_t getrandom(void* buf, size_t buflen, unsigned int flags);
int dup(int oldfd);

int sigemptyset(sigset_t* set);
int sigaddset(sigset_t* set, int signo);
#include <unistd.h>
char* ttyname(int fd);
int ttyname_r(int fd, char* buf, size_t buflen);

#include <sys/stat.h>

int chmod(const char* path, mode_t mode);
int fchmod(int fd, mode_t mode);
int lchmod(const char* path, mode_t mode);
int fchmodat(int fd, const char* path, mode_t mode, int flag);
int chflags(const char* path, unsigned long flags);
int lchflags(const char* path, unsigned long flags);
void sync(void);
int chown(const char* path, uid_t owner, gid_t group);
int fchown(int fd, uid_t owner, gid_t group);
int lchown(const char* path, uid_t owner, gid_t group);
int fchownat(int fd, const char* path, uid_t owner, gid_t group, int flag);
int nice(int inc);

//#include <sys/resource.h>
int getpriority(int which, id_t who);
int setpriority(int which, id_t who, int prio);

mode_t umask(mode_t mask);

#include <sys/time.h>
int futimes(int fd, const struct timeval tv[2]);
int lutimes(const char* filename, const struct timeval tv[2]);

int execv(const char* path, char* const argv[]);
int fexecve(int fd, char* const argv[], char* const envp[]);
int execve(const char* pathname, char* const argv[], char* const envp[]);

struct sched_param {
  int sched_priority;
};

struct sigaction {
  void (*sa_handler)(int);
  void (*sa_sigaction)(int, void*, void*);
  sigset_t sa_mask;
  int sa_flags;
  void (*sa_restorer)(void);
};

int sigaction(int signum, const struct sigaction* restrict act,
              struct sigaction* restrict oldact);

pid_t fork(void);

int sched_get_priority_max(int policy);
int sched_get_priority_min(int policy);
int sched_setscheduler(pid_t pid, int policy, const struct sched_param* param);
int sched_getscheduler(pid_t pid);
int sched_setparam(pid_t pid, const struct sched_param* param);
int sched_getparam(pid_t pid, struct sched_param* param);
int sched_rr_get_interval(pid_t pid, struct timespec* tp);

gid_t getgid(void);
gid_t getegid(void);
uid_t getuid(void);
uid_t geteuid(void);
int getgroups(int size, gid_t list[]);
pid_t getpgid(pid_t pid);
pid_t getpgrp(pid_t pid);
int setpgrp(pid_t pid, pid_t pgid);
int kill(pid_t pid, int sig);
int killpg(int pgrp, int sig);
pid_t getppid(void);

int plock(int opr);

int setuid(uid_t uid);
int seteuid(uid_t euid);
int setegid(gid_t egid);
int setreuid(uid_t ruid, uid_t euid);
int setregid(gid_t rgid, gid_t egid);
int setgid(gid_t gid);

typedef struct {
  pid_t si_pid;
  uid_t si_uid;
  int si_signo;
  int si_status;
  int si_code;
  int si_errno;
} siginfo_t;
typedef int idtype_t;
int waitid(idtype_t idtype, id_t id, siginfo_t* infop, int options);
pid_t wait(int* status);
pid_t waitpid(pid_t pid, int* status, int options);

pid_t getpid(void);

pid_t getsid(pid_t pid);
pid_t setsid(void);
int setpgid(pid_t pid, pid_t pgid);

pid_t tcgetpgrp(int fd);
int tcsetpgrp(int fd, pid_t pgrp);

int fdwalk(int (*func)(void*, int), void* cd);
int dup2(int oldfd, int newfd);
int dup3(int oldfd, int newfd, int flags);

int lockf(int fd, int cmd, off_t len);
ssize_t preadv(int fd, const struct iovec* iov, int iovcnt, off_t offset);
ssize_t preadv2(int fd, const struct iovec* iov, int iovcnt, off_t offset,
                int flags);

int pipe(int pipefd[2]);
int pipe2(int pipefd[2], int flags);

ssize_t pwritev2(int fd, const struct iovec* iov, int iovcnt, off_t offset,
                 int flags);

typedef long long off64_t;
ssize_t copy_file_range(int fd_in, off64_t* off_in, int fd_out,
                        off64_t* off_out, size_t len, unsigned int flags);

int mkfifoat(int dirfd, const char* pathname, mode_t mode);
int mkfifo(const char* pathname, mode_t mode);
int mknodat(int dirfd, const char* pathname, mode_t mode, dev_t dev);
int mknod(const char* pathname, mode_t mode, dev_t dev);
int getloadavg(double loadavg[], int nelem);
int setresuid(uid_t ruid, uid_t euid, uid_t suid);
int setresgid(gid_t rgid, gid_t egid, gid_t sgid);
int getresuid(uid_t* ruid, uid_t* euid, uid_t* suid);
int getresgid(gid_t* rgid, gid_t* egid, gid_t* sgid);

struct itimerval {
  struct timeval it_interval; /* Interval for periodic timer */
  struct timeval it_value;    /* Time until next expiration */
};

unsigned int alarm(unsigned int seconds);
int pause(void);

int siginterrupt(int sig, int flag);
int getitimer(int which, struct itimerval* curr_value);
int setitimer(int which, const struct itimerval* restrict new_value,
              struct itimerval* restrict old_value);
int sigismember(const sigset_t* set, int signo);

int pthread_sigmask(int how, const sigset_t* set, sigset_t* oldset);
int sigpending(sigset_t* set);
int sigwait(const sigset_t* restrict set, int* restrict sig);
int sigfillset(sigset_t* set);

int sigwaitinfo(const sigset_t* restrict set, siginfo_t* restrict info);
int sigtimedwait(const sigset_t* set, siginfo_t* info,
                 const struct timespec* timeout);
int pthread_kill(pthread_t thread, int sig);

int clock_settime(clockid_t clk_id, const struct timespec* tp);

typedef struct {
  void* ss_sp;    /* Base address of stack */
  int ss_flags;   /* Flags */
  size_t ss_size; /* Number of bytes in stack */
} stack_t;
int sigaltstack(const stack_t* restrict ss, stack_t* restrict old_ss);
#define SA_NODEFER 0
#define SA_ONSTACK 0
#define SA_RESTART 0
#define RLIMIT_CORE 0
#define SIG_SETMASK 0
#define SIGSTKSZ 0

typedef int rlim_t;
struct rlimit {
  rlim_t rlim_cur; /* Soft limit */
  rlim_t rlim_max; /* Hard limit (ceiling for rlim_cur) */
};
int getrlimit(int resource, struct rlimit* rlim);
int setrlimit(int resource, const struct rlimit* rlim);

char* realpath(const char* restrict path, char* restrict resolved_path);

int close_range(unsigned int first, unsigned int last,
                       unsigned int flags);

// These are not needed by Python but are needed by PARI:
typedef void* jmp_buf;
typedef void* sigjmp_buf;
int setjmp(jmp_buf env);
int sigsetjmp(sigjmp_buf env, int savesigs);
void longjmp(jmp_buf env, int val);
void siglongjmp(sigjmp_buf env, int val);
struct _IO_FILE { char __x; };
typedef struct _IO_FILE FILE;
FILE* popen(const char* command, const char* type);
int pclose(FILE* stream);
struct passwd* getpwnam(const char* name);
struct passwd* getpwuid(uid_t uid);
void (*signal(int sig, void (*func)(int)))(int);

#endif
