#ifndef LIBSTUB
#define LIBSTUB

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

#endif
