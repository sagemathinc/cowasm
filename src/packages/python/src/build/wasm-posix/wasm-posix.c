/*
zig cc -w -target wasm32-wasi stub.c -c -o stub.o && zig ar -crs libstub.a
stub.o
*/

#include "wasm-posix.h"

#define STUB(x) printf("STUB: %s\n", x);
#include <pty.h>

int openpty(int* amaster, int* aslave, char* name, const struct termios* termp,
            const struct winsize* winp){STUB("openpty")}

pid_t forkpty(int* amaster, char* name, const struct termios* termp,
              const struct winsize* winp) {
  STUB("forkpty")
}

// int pthread_sigmask(int how, const sigset_t *set, sigset_t *oldset) { STUB }

#include <pthread.h>

int pthread_condattr_getclock(const pthread_condattr_t* restrict attr,
                              clockid_t* restrict clock_id) {
  STUB("pthread_condattr_getclock")
}
int pthread_condattr_setclock(pthread_condattr_t* attr, clockid_t clock_id) {
  STUB("pthread_condattr_setclock")
}
int pthread_create(pthread_t* thread, const pthread_attr_t* attr,
                   void* (*start_routine)(void*), void* arg) {
  STUB("pthread_create")
}

int pthread_detach(pthread_t thread) { STUB("pthread_detach") }

int pthread_attr_setstacksize(pthread_attr_t* attr, size_t stacksize) {
  STUB("pthread_attr_setstacksize")
}
int pthread_attr_getstacksize(const pthread_attr_t* attr, size_t* stacksize) {
  STUB("pthread_attr_getstacksize")
}

#include <semaphore.h>

int sem_init(sem_t* sem, int pshared, unsigned int value) { STUB("sem_init") }

int sem_destroy(sem_t* sem) { STUB("sem_destroy") }

int sem_wait(sem_t* sem) { STUB("sem_wait") }

int sem_trywait(sem_t* sem) { STUB("sem_trywait") }

int sem_timedwait(sem_t* sem, const struct timespec* abs_timeout) {
  STUB("sem_timedwait")
}

int sem_post(sem_t* sem) { STUB("sem_post") }

int pthread_key_create(pthread_key_t* key, void (*destructor)(void*)) {
  STUB("pthread_key_create")
  return 0;
}

int pthread_key_delete(pthread_key_t key) {
  STUB("pthread_key_delete");
  return 0;
}

void* pthread_key_value;
void* pthread_getspecific(pthread_key_t key) {
  //STUB("pthread_getspecific")
  //printf("pthread_getspecific %p\n", (void*)key);
  return pthread_key_value;
}

int pthread_setspecific(pthread_key_t key, const void* value) {
  pthread_key_value = value;
  STUB("pthread_setspecific");
  printf("pthread_setspecific %p = %p\n", (void*)key, (void*)value);
  return 0;
}

int pthread_kill(pthread_t thread, int sig) {
  STUB("pthread_kill")
  return 0;
}

#include <time.h>
int pthread_getcpuclockid(pthread_t thread, clockid_t* clock_id) {
  STUB("pthread_getcpuclockid")
  return 0;
}

int pthread_mutex_lock(pthread_mutex_t* mutex) {
  STUB("pthread_mutex_lock")
  return 0;
}
int pthread_mutex_trylock(pthread_mutex_t* mutex) {
  STUB("pthread_mutex_trylock")
  return 0;
}
int pthread_mutex_unlock(pthread_mutex_t* mutex) {
  STUB("pthread_mutex_unlock")
  return 0;
}

int pthread_mutex_destroy(pthread_mutex_t* mutex) {
  STUB("pthread_mutex_destroy")
  return 0;
}
int pthread_mutex_init(pthread_mutex_t* restrict mutex,
                       const pthread_mutexattr_t* restrict attr) {
  STUB("pthread_mutex_init")
  return 0;
}
int pthread_cond_broadcast(pthread_cond_t* cond) {
  STUB("pthread_cond_broadcast")
  return 0;
}
int pthread_cond_signal(pthread_cond_t* cond) {
  STUB("pthread_cond_signal")
  return 0;
}

int pthread_condattr_destroy(pthread_condattr_t* attr) {
  STUB("pthread_condattr_destroy")
  return 0;
}
int pthread_condattr_init(pthread_condattr_t* attr) {
  STUB("pthread_condattr_init")
  return 0;
}

int pthread_cond_timedwait(pthread_cond_t* restrict cond,
                           pthread_mutex_t* restrict mutex,
                           const struct timespec* restrict abstime) {
  STUB("pthread_cond_timedwait")
  return 0;
}
int pthread_cond_wait(pthread_cond_t* restrict cond,
                      pthread_mutex_t* restrict mutex) {
  STUB("pthread_cond_wait")
  return 0;
}

void pthread_exit(void* retval) { STUB("pthread_exit") }

int pthread_cond_destroy(pthread_cond_t* cond) {
  STUB("pthread_cond_destroy");
  return 0;
}

int pthread_cond_init(pthread_cond_t* restrict cond,
                      const pthread_condattr_t* restrict attr) {
  STUB("pthread_cond_init")
  printf("returning 0 from pthread_cond_init!\n");
  return 0;
}

ssize_t getrandom(void* buf, size_t buflen, unsigned int flags) {
  STUB("getrandom")
}

int dup(int oldfd) { STUB("dup") }

int sigemptyset(sigset_t* set) { STUB("sigemptyset") }
int sigaddset(sigset_t* set, int signo) { STUB("sigaddset") }
char* ttyname(int fd) { STUB("ttyname") }
int ttyname_r(int fd, char* buf, size_t buflen) { STUB("ttyname_r") }

int chmod(const char* path, mode_t mode) { STUB("chmod") }
int fchmod(int fd, mode_t mode) { STUB("fchmod") }
int lchmod(const char* path, mode_t mode) { STUB("lchmod") }
int fchmodat(int fd, const char* path, mode_t mode, int flag) {
  STUB("fchmodat")
}
int chflags(const char* path, unsigned long flags) { STUB("chflags") }
int lchflags(const char* path, unsigned long flags) { STUB("lchflags") }
void sync(void) { STUB("sync") }
int chown(const char* path, uid_t owner, gid_t group) { STUB("chown") }
int fchown(int fd, uid_t owner, gid_t group) { STUB("fchown") }
int lchown(const char* path, uid_t owner, gid_t group) { STUB("lchown") }
int fchownat(int fd, const char* path, uid_t owner, gid_t group, int flag) {
  STUB("fchownat")
}
int nice(int inc) { STUB("nice") }

int getpriority(int which, id_t who) { STUB("getpriority") }
int setpriority(int which, id_t who, int prio){STUB("setpriority")}

mode_t umask(mode_t mask) {
  STUB("umask")
}

int futimes(int fd, const struct timeval tv[2]) { STUB("futimes") }
int lutimes(const char* filename, const struct timeval tv[2]) {
  STUB("lutimes")
}

int execv(const char* path, char* const argv[]) { STUB("execv") }
int fexecve(int fd, char* const argv[], char* const envp[]) { STUB("fexecve") }
int execve(const char* pathname, char* const argv[], char* const envp[]) {
  STUB("execve")
}

int sigaction(int signum, const struct sigaction* restrict act,
              struct sigaction* restrict oldact){STUB("sigaction")}

pid_t fork(void) {
  STUB("fork")
}

int sched_get_priority_max(int policy) { STUB("sched_get_priority_max") }
int sched_get_priority_min(int policy) { STUB("sched_get_priority_min") }
int sched_setscheduler(pid_t pid, int policy, const struct sched_param* param) {
  STUB("sched_setscheduler")
}
int sched_getscheduler(pid_t pid) { STUB("sched_getscheduler") }
int sched_setparam(pid_t pid, const struct sched_param* param) {
  STUB("sched_setparam")
}
int sched_getparam(pid_t pid, struct sched_param* param) {
  STUB("sched_getparam")
}
int sched_rr_get_interval(pid_t pid,
                          struct timespec* tp){STUB("sched_rr_get_interval")}

gid_t getgid(void){STUB("getgid")}

gid_t getegid(void){STUB("getegid")}

uid_t getuid(void){STUB("getuid")}

uid_t geteuid(void) {
  STUB("geteuid")
}
int getgroups(int size, gid_t list[]){STUB("getgroups")}

pid_t getpgid(pid_t pid){STUB("getpgid")}

pid_t getpgrp(pid_t pid) {
  STUB("getpgrp")
}
int setpgrp(pid_t pid, pid_t pgid) { STUB("setpgrp") }
int kill(pid_t pid, int sig) { STUB("kill") }
int killpg(int pgrp, int sig){STUB("killpg")}

pid_t getppid(void) {
  STUB("getppid")
}

int plock(int opr) { STUB("plock") }

int setuid(uid_t uid) { STUB("setuid") }
int seteuid(uid_t euid) { STUB("seteuid") }
int setegid(gid_t egid) { STUB("setegid") }
int setreuid(uid_t ruid, uid_t euid) { STUB("setreuid") }
int setregid(gid_t rgid, gid_t egid) { STUB("setregid") }
int setgid(gid_t gid) { STUB("setgid") }

int waitid(idtype_t idtype, id_t id, siginfo_t* infop,
           int options){STUB("waitid")}

pid_t wait(int* status){STUB("wait")}

pid_t waitpid(pid_t pid, int* status, int options){STUB("waitpid")}

pid_t getpid(void) {
  STUB("getpid");
  return 1;
}

pid_t getsid(pid_t pid){STUB("getsid")}

pid_t setsid(void) {
  STUB("getsid")
}
int setpgid(pid_t pid, pid_t pgid){STUB("setpgid")}

pid_t tcgetpgrp(int fd) {
  STUB("tcgetpgrp")
}
int tcsetpgrp(int fd, pid_t pgrp) { STUB("tcsetpgrp") }

int fdwalk(int (*func)(void*, int), void* cd) { STUB("fdwalk") }
int dup2(int oldfd, int newfd) { STUB("dup2") }
int dup3(int oldfd, int newfd, int flags) { STUB("dup3") }

int lockf(int fd, int cmd, off_t len){STUB("lockf")}

ssize_t preadv(int fd, const struct iovec* iov, int iovcnt,
               off_t offset){STUB("preadv")}

ssize_t preadv2(int fd, const struct iovec* iov, int iovcnt, off_t offset,
                int flags) {
  STUB("preadv2")
}

int pipe(int pipefd[2]) { STUB("pipe") }

int pipe2(int pipefd[2], int flags){STUB("pipe2")}

ssize_t pwritev2(int fd, const struct iovec* iov, int iovcnt, off_t offset,
                 int flags){STUB("pwritev2")}

ssize_t copy_file_range(int fd_in, off64_t* off_in, int fd_out,
                        off64_t* off_out, size_t len, unsigned int flags) {
  STUB("copy_file_range")
}

int mkfifoat(int dirfd, const char* pathname, mode_t mode) { STUB("mkfifoat") }
int mkfifo(const char* pathname, mode_t mode) { STUB("mkfifo") }
int mknodat(int dirfd, const char* pathname, mode_t mode, dev_t dev) {
  STUB("mknodat")
}
int mknod(const char* pathname, mode_t mode, dev_t dev) { STUB("mknod") }
int getloadavg(double loadavg[], int nelem) { STUB("getloadavg") }
int setresuid(uid_t ruid, uid_t euid, uid_t suid) { STUB("setresuid") }
int setresgid(gid_t rgid, gid_t egid, gid_t sgid) { STUB("setresgid") }
int getresuid(uid_t* ruid, uid_t* euid, uid_t* suid) { STUB("getresuid") }
int getresgid(gid_t* rgid, gid_t* egid, gid_t* sgid) { STUB("getresgid") }

unsigned int alarm(unsigned int seconds) { STUB("alarm") }
int pause(void) { STUB("pause") }

int siginterrupt(int sig, int flag) { STUB("siginterrupt") }
int getitimer(int which, struct itimerval* curr_value) { STUB("getitimer") }
int setitimer(int which, const struct itimerval* restrict new_value,
              struct itimerval* restrict old_value) {
  STUB("setitimer")
}
int sigismember(const sigset_t* set, int signo) { STUB("sigismember") }

int pthread_sigmask(int how, const sigset_t* set, sigset_t* oldset) {
  STUB("pthread_sigmask")
}
int sigpending(sigset_t* set) { STUB("sigpending") }
int sigwait(const sigset_t* restrict set, int* restrict sig) { STUB("sigwait") }
int sigfillset(sigset_t* set) { STUB("sigfillset") }

int sigwaitinfo(const sigset_t* restrict set, siginfo_t* restrict info) {
  STUB("sigwaitinfo")
}
int sigtimedwait(const sigset_t* set, siginfo_t* info,
                 const struct timespec* timeout) {
  STUB("sigtimedwait")
}
int clock_settime(clockid_t clk_id, const struct timespec* tp) {
  STUB("clock_settime")
}
int sigaltstack(const stack_t* restrict ss, stack_t* restrict old_ss) {
  STUB("sigaltstack")
}
int getrlimit(int resource, struct rlimit* rlim) { STUB("getrlimit") }
int setrlimit(int resource, const struct rlimit* rlim) { STUB("setrlimit") }

int pthread_attr_init(pthread_attr_t* attr) { STUB("pthread_attr_init") }
int pthread_attr_destroy(pthread_attr_t* attr){STUB("pthread_attr_destroy")}

pthread_t pthread_self(void) {
  STUB("pthread_self")
}

#include <stdio.h>
void flockfile(FILE* filehandle) { STUB("flockfile") }
void funlockfile(FILE* filehandle) { STUB("funlockfile") }
void* dlsym(void* restrict handle, const char* restrict symbol) {
  STUB("dlsym")
}
void* dlopen(const char* filename, int flags) { STUB("dlopen") }
int dlclose(void* handle) { STUB("dlclose") }

char* dlerror(void) { STUB("dlerror") }

char* ctermid(char* s) { STUB("ctermid") }
int system(const char* command) { STUB("system") }

int getgrouplist(const char* user, gid_t group, gid_t* groups, int* ngroups) {
  STUB("getgrouplist")
}

char* getlogin(void) { STUB("getlogin") }

int setgroups(size_t size, const gid_t* list) { STUB("setgroups") }

int initgroups(const char* user, gid_t group){STUB("initgroups")}

ssize_t sendfile(int out_fd, int in_fd, off_t* offset, size_t count) {
  STUB("sendfile")
}

int statvfs(const char* path, struct statvfs* buf) { STUB("statvfs") }

int fstatvfs(int fd, struct statvfs* buf) { STUB("fstatvfs") }

int memfd_create(const char* name, unsigned int flags) { STUB("memfd_create") }

typedef void* posix_spawn_file_actions_t;
int posix_spawn_file_actions_destroy(posix_spawn_file_actions_t* file_actions) {
  STUB("posix_spawn_file_actions_destroy")
}
int posix_spawn_file_actions_init(posix_spawn_file_actions_t* file_actions) {
  STUB("posix_spawn_file_actions_init")
}
int posix_spawn_file_actions_addclose(posix_spawn_file_actions_t* file_actions,
                                      int fildes) {
  STUB("posix_spawn_file_actions_addclose")
}
int posix_spawn_file_actions_addopen(
    posix_spawn_file_actions_t* restrict file_actions, int fildes,
    const char* restrict path, int oflag, mode_t mode) {
  STUB("posix_spawn_file_actions_addopen")
}

int posix_spawn_file_actions_adddup2(posix_spawn_file_actions_t* file_actions,
                                     int fildes, int newfildes) {
  STUB("posix_spawn_file_actions_adddup2")
}

typedef void* posix_spawnattr_t;
int posix_spawnattr_destroy(posix_spawnattr_t* attr) {
  STUB("posix_spawnattr_destroy")
}
int posix_spawnattr_init(posix_spawnattr_t* attr) {
  STUB("posix_spawnattr_init")
}
int posix_spawnattr_getpgroup(const posix_spawnattr_t* restrict attr,
                              pid_t* restrict pgroup) {
  STUB("posix_spawnattr_getpgroup")
}
int posix_spawnattr_setpgroup(posix_spawnattr_t* attr, pid_t pgroup) {
  STUB("posix_spawnattr_setpgroup")
}

int posix_spawnattr_getsigmask(const posix_spawnattr_t* restrict attr,
                               sigset_t* restrict sigmask) {
  STUB("posix_spawnattr_getsigmask")
}
int posix_spawnattr_setsigmask(posix_spawnattr_t* restrict attr,
                               const sigset_t* restrict sigmask) {
  STUB("posix_spawnattr_setsigmask")
}

int posix_spawnattr_setschedpolicy(posix_spawnattr_t* attr, int schedpolicy) {
  STUB("posix_spawnattr_setschedpolicy")
}

int posix_spawnattr_getschedparam(const posix_spawnattr_t* restrict attr,
                                  struct sched_param* restrict schedparam) {
  STUB("posix_spawnattr_getschedparam")
}
int posix_spawnattr_setschedparam(posix_spawnattr_t* restrict attr,
                                  const struct sched_param* restrict
                                      schedparam) {
  STUB("posix_spawnattr_setschedparam")
}

int posix_spawn(pid_t* restrict pid, const char* restrict path,
                const posix_spawn_file_actions_t* restrict file_actions,
                const posix_spawnattr_t* restrict attrp,
                char* const argv[restrict], char* const envp[restrict]) {
  STUB("posix_spawn")
}
int posix_spawnp(pid_t* restrict pid, const char* restrict file,
                 const posix_spawn_file_actions_t* restrict file_actions,
                 const posix_spawnattr_t* restrict attrp,
                 char* const argv[restrict], char* const envp[restrict]) {
  STUB("posix_spawnp")
}

int posix_spawnattr_getsigdefault(const posix_spawnattr_t* restrict attr,
                                  sigset_t* restrict sigdefault) {
  STUB("posix_spawnattr_getsigdefault")
}
int posix_spawnattr_setsigdefault(posix_spawnattr_t* restrict attr,
                                  const sigset_t* restrict sigdefault) {
  STUB("posix_spawnattr_setsigdefault")
}

int getpwnam_r(const char* name, struct passwd* pwd, char* buf, size_t buflen,
               struct passwd** result) {
  STUB("getpwnam_r")
}

int getpwuid_r(uid_t uid, struct passwd* pwd, char* buf, size_t buflen,
               struct passwd** result) {
  STUB("getpwuid_r")
}

struct passwd* getpwent(void) {
  STUB("passwd")
}

void setpwent(void) { STUB("setpwent") }

void endpwent(void) { STUB("endpwent") }

char* gettext(const char* msgid) { STUB('gettext') }
char* dgettext(const char* domainname, const char* msgid) { STUB("dgettext") }
char* dcgettext(const char* domainname, const char* msgid, int category) {
  STUB("dcgettext")
}

int posix_spawnattr_setflags(posix_spawnattr_t* attr, short flags) {
  STUB("posix_spawnattr_setflags")
}

char* textdomain(const char* domainname) { STUB("textdomain") }

char* bindtextdomain(const char* domainname, const char* dirname) {
  STUB("bindtextdomain")
}

char* bind_textdomain_codeset(const char* domainname, const char* codeset) {
  STUB("bind_textdomain_codeset")
}

char* realpath(const char* restrict path,
               char* restrict resolved_path){STUB("realpath")}

clock_t times(struct tms* buf) {
  STUB("times")
}

int raise(int sig) {
  STUB("raise");
  return 0;
}

char* strsignal(int sig) {
  STUB("strsignal");
  return "a signal";
}

int getrusage(int who, struct rusage* usage) {
  STUB("getrusage");
  return 0;
}

clock_t clock(void) { STUB("clock") }

void __SIG_IGN(int sig) { STUB("__SIG_IGN"); }

void __SIG_ERR(int sig) { STUB("__SIG_ERR"); }
