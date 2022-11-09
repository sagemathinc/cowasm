#ifndef WASMPOSIX
#define WASMPOSIX

#include <sys/types.h>

#define GRND_NONBLOCK 0x0001
#define GRND_RANDOM 0x0002
#define GRND_INSECURE 0x0004

ssize_t getrandom(void* buf, size_t buflen, unsigned int flags);
int dup(int oldfd);

typedef unsigned char sigset_t;
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

struct ttyent {
  char* ty_name;        /* terminal device name */
  char* ty_getty;       /* command to execute, usually getty */
  char* ty_type;        /* terminal type for termcap */
#define TTY_ON 0x01     /* enable logins (start ty_getty program) */
#define TTY_SECURE 0x02 /* allow uid of 0 to login */
  int ty_status;        /* status flags */
  char* ty_window;      /* command to start up window manager */
  char* ty_comment;     /* comment field */
};

struct ttyent* getttyent(void);
struct ttyent* getttynam(const char* name);

//#include <sys/resource.h>
int getpriority(int which, id_t who);
int setpriority(int which, id_t who, int prio);

mode_t umask(mode_t mask);

#include <sys/time.h>
int futimes(int fd, const struct timeval tv[2]);
int lutimes(const char* filename, const struct timeval tv[2]);
int utimes(const char* path, const struct timeval times[2]);

int execv(const char* path, char* const argv[]);
int fexecve(int fd, char* const argv[], char* const envp[]);
int execve(const char* pathname, char* const argv[], char* const envp[]);
int execlp(const char* file, const char* arg, ... /* (char  *) NULL */);
int execvp(const char* file, char* const argv[]);

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

int sigaction(int signum, const struct sigaction* act,
              struct sigaction* oldact);

pid_t fork(void);

pid_t fork1(void);
pid_t vfork(void);

ssize_t splice(int fd_in, void* off_in, int fd_out, void* off_out, size_t len,
               unsigned int flags);
int login_tty(int fd);
int eventfd(unsigned int initval, int flags);

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
// ncurses wants this:
pid_t getpgrp(void); /* POSIX.1 version */
// but cpython may get confused and want this (it's configurable):
// pid_t getpgrp(pid_t pid); /* BSD version */
pid_t getpgid(pid_t pid);

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

#define WNOHANG 1
#define WUNTRACED 2
#define WSTOPPED 2
#define WEXITED 4
#define WCONTINUED 8
#define WNOWAIT 0x1000000
#define __WNOTHREAD 0x20000000
#define __WALL 0x40000000
#define __WCLONE 0x80000000

typedef struct {
  pid_t si_pid;
  uid_t si_uid;
  int si_signo;
  int si_status;
  int si_code;
  int si_errno;
  void* si_addr;
} siginfo_t;

// From packages/zig/dist/lib/libc/musl/include/sys/wait.h and needed for
// Python.  The #ifndef is because slightly different versions of sys/wait.h
// get included from zig for cowasm-cc versus normal zig, I think, maybe. TODO!
#include <sys/wait.h>
#ifndef _SYS_WAIT_H
typedef enum { P_ALL = 0, P_PID = 1, P_PGID = 2, P_PIDFD = 3 } idtype_t;
#define WEXITSTATUS(s) (((s)&0xff00) >> 8)
#define WTERMSIG(s) ((s)&0x7f)
#define WSTOPSIG(s) WEXITSTATUS(s)
#define WIFEXITED(s) (!WTERMSIG(s))
#define WIFSTOPPED(s) ((short)((((s)&0xffff) * 0x10001) >> 8) > 0x7f00)
#define WIFSIGNALED(s) (((s)&0xffff) - 1U < 0xffu)
#endif

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

int mkstemp(char* temp);
int mkstemps(char* templ, int suffixlen);
char* mkdtemp(char* templ);

int mkfifoat(int dirfd, const char* pathname, mode_t mode);
int mkfifo(const char* pathname, mode_t mode);
int mknodat(int dirfd, const char* pathname, mode_t mode, dev_t dev);
int mknod(const char* pathname, mode_t mode, dev_t dev);
int getloadavg(double loadavg[], int nelem);
int setresuid(uid_t ruid, uid_t euid, uid_t suid);
int setresgid(gid_t rgid, gid_t egid, gid_t sgid);
int getresuid(uid_t* ruid, uid_t* euid, uid_t* suid);
int getresgid(gid_t* rgid, gid_t* egid, gid_t* sgid);

char* strcasestr(const char*, const char*);

struct itimerval {
  struct timeval it_interval; /* Interval for periodic timer */
  struct timeval it_value;    /* Time until next expiration */
};

unsigned int alarm(unsigned int seconds);
int pause(void);

int siginterrupt(int sig, int flag);
int getitimer(int which, struct itimerval* curr_value);
int setitimer(int which, const struct itimerval* new_value,
              struct itimerval* old_value);
int sigismember(const sigset_t* set, int signo);

int sigpending(sigset_t* set);
int sigwait(const sigset_t* set, int* sig);
int sigfillset(sigset_t* set);
int sigprocmask(int, const sigset_t* __restrict, sigset_t* __restrict);
int sigsuspend(const sigset_t*);
int sigwaitinfo(const sigset_t* set, siginfo_t* info);
int sigtimedwait(const sigset_t* set, siginfo_t* info,
                 const struct timespec* timeout);

int clock_settime(clockid_t clk_id, const struct timespec* tp);

typedef struct {
  void* ss_sp;    /* Base address of stack */
  int ss_flags;   /* Flags */
  size_t ss_size; /* Number of bytes in stack */
} stack_t;
int sigaltstack(const stack_t* ss, stack_t* old_ss);
#define SA_NODEFER 0
#define SA_ONSTACK 0
#define SA_RESTART 0
#define SIGSTKSZ 0
#define SIG_BLOCK 0
#define SIG_UNBLOCK 1
#define SIG_SETMASK 2

#define SI_ASYNCNL (-60)
#define SI_TKILL (-6)
#define SI_SIGIO (-5)
#define SI_ASYNCIO (-4)
#define SI_MESGQ (-3)
#define SI_TIMER (-2)
#define SI_QUEUE (-1)
#define SI_USER 0
#define SI_KERNEL 128

#define RLIMIT_CORE 0
#define RLIM_INFINITY -1
#define RLIM_NLIMITS 16

typedef int rlim_t;
struct rlimit {
  rlim_t rlim_cur; /* Soft limit */
  rlim_t rlim_max; /* Hard limit (ceiling for rlim_cur) */
};
int getrlimit(int resource, struct rlimit* rlim);
int setrlimit(int resource, const struct rlimit* rlim);

char* realpath(const char* path, char* resolved_path);

int close_range(unsigned int first, unsigned int last, unsigned int flags);

// These are not needed by Python but are needed by PARI:
typedef void* jmp_buf;
typedef void* sigjmp_buf;
int setjmp(jmp_buf env);
int sigsetjmp(sigjmp_buf env, int savesigs);
void longjmp(jmp_buf env, int val);
void siglongjmp(sigjmp_buf env, int val);
struct _IO_FILE {
  char __x;
};
typedef struct _IO_FILE FILE;
FILE* popen(const char* command, const char* type);
int pclose(FILE* stream);
struct passwd* getpwnam(const char* name);
struct passwd* getpwuid(uid_t uid);
// void (*signal(int sig, void (*func)(int)))(int);

typedef unsigned int socklen_t;
#define SO_ERROR 0x1007
#define SOMAXCONN 32
#define SOCK_SEQPACKET 5
#define __WASI_RIFLAGS_RECV_DATA_TRUNCATED 0
int accept(int sockfd, void* addr, void* addrlen);
int setsockopt(int sockfd, int level, int optname, const void* optval,
               socklen_t optlen);
int bind(int sockfd, const void* addr, socklen_t addrlen);
int connect(int sockfd, const void* addr, socklen_t addrlen);
int getsockname(int sockfd, void* addr, socklen_t* addrlen);
int getpeername(int sockfd, void* addr, socklen_t* addrlen);
int listen(int sockfd, int backlog);
ssize_t recvfrom(int sockfd, void* buf, size_t len, int flags, void* src_addr,
                 socklen_t* addrlen);
ssize_t sendto(int sockfd, const void* buf, size_t len, int flags,
               const void* dest_addr, socklen_t addrlen);
int socket(int domain, int type, int protocol);
int gethostname(char* name, size_t len);
int sethostname(const char* name, size_t len);

// These are needed to build parts of posixmodule in Python.  They seem harmless
// since they are self contained and copied from
// packages/zig/dist/lib/libc/musl/include/stdlib.h We may need to change them
// if we invent some notion of fork and subprocesses for our runtime!

#define WSTOPSIG(s) WEXITSTATUS(s)

// needed by sqlite; copied from packages/zig/dist/lib/libc/musl/include/fcntl.h
// and packages/zig/dist/lib/libc/musl/arch/aarch64/bits/fcntl.h
// Main point is if/when I implement these at the WASI level, have to use them
// and be consistent.

#define F_RDLCK 0
#define F_WRLCK 1
#define F_UNLCK 2

#define F_DUPFD 0
#ifndef F_GETFD
#define F_GETFD 1
#define F_SETFD 2
#define F_GETFL 3
#define F_SETFL 4
#endif
#define F_GETLK 5
#define F_SETLK 6
#define F_SETLKW 7
#define F_SETOWN 8
#define F_GETOWN 9
#define F_SETSIG 10
#define F_GETSIG 11

void flockfile(FILE* filehandle);
int ftrylockfile(FILE* filehandle);
void funlockfile(FILE* filehandle);

char* strsignal(int sig);

int fiprintf(FILE* stream, const char* format, ...);
int siprintf(char* s, const char* format, ...);
#define __small_sprintf sprintf

int strunvis(char* dst, const char* src);
int strnvis(char* dst, size_t dlen, const char* src, int flag);
int strvis(char* dst, const char* src, int flag);

#include <termios.h>
speed_t cfgetispeed(const struct termios* termios_p);
speed_t cfgetospeed(const struct termios* termios_p);
int tcgetattr(int fd, struct termios* tio);
int tcsetattr(int fd, int act, const struct termios* tio);

int fchdir(int fd);

#define SA_SIGINFO 4

// WASI can't set time, but things will try so these should be
// implemented as functions that display an error.  They are part of POSIX.
// They could work on a server though, if you're running as root!  I did
// implement related things in posix-node, I think.
int settimeofday(const struct timeval*, const struct timezone*);
int adjtime(const struct timeval*, struct timeval*);

// implemented in zig in wasm/posix/other.zig
int getpagesize(void);

const char* getprogname(void);

void setprogname(const char* progname);

// The following constants are all copied from grepping the musl/wasi headers.
#define TIOCGWINSZ 0x5413
#define S_ISTXT S_ISVTX
#define LINE_MAX 4096

long long strtonum(const char*, long long, long long, const char**);

mode_t getmode(const void* bbox, mode_t omode);
void* setmode(const char* p);

int mergesort(void*, size_t, size_t, int (*)(const void*, const void*));
int heapsort(void*, size_t, size_t, int (*)(const void*, const void*));

int cowasm_fstat(int fildes, struct stat* buf);
int cowasm_lstat(const char* path, struct stat* buf);
int cowasm_stat(const char* path, struct stat* buf);
int cowasm_fstatat(int fd, const char* path, struct stat* buf, int flag);

#if defined(_GNU_SOURCE) || defined(_BSD_SOURCE)
quad_t strtoq(const char* str, char** endptr, int base);

#define UQUAD_MAX ULLONG_MAX
#define QUAD_MAX LLONG_MAX
#define QUAD_MIN LLONG_MIN

#define REG_BASIC 0000
#define MAXLOGNAME 255 /* max login name length */

int rpmatch(const char* response);
#endif  // BSD_SOURCE


#include "netdb.h"
char * inet_ntoa(struct in_addr in);

#endif
