#define STUB
#include <pty.h>

int openpty(int *amaster, int *aslave, char *name, const struct termios *termp,
            const struct winsize *winp){STUB}

pid_t forkpty(int *amaster, char *name, const struct termios *termp,
              const struct winsize *winp) {
  STUB
}

#include <signal.h>

int pthread_sigmask(int how, const sigset_t *set, sigset_t *oldset) { STUB }

#include <pthread.h>

int pthread_condattr_getclock(const pthread_condattr_t *restrict attr,
                              clockid_t *restrict clock_id) {
  STUB
}
int pthread_condattr_setclock(pthread_condattr_t *attr, clockid_t clock_id) {
  STUB
}
int pthread_create(pthread_t *thread, const pthread_attr_t *attr,
                   void *(*start_routine)(void *), void *arg) {
  STUB
}

int pthread_detach(pthread_t thread) { STUB }

int pthread_attr_setstacksize(pthread_attr_t *attr, size_t stacksize) { STUB }
int pthread_attr_getstacksize(const pthread_attr_t *attr, size_t *stacksize) {
  STUB
}

#include <semaphore.h>

int sem_init(sem_t *sem, int pshared, unsigned int value) { STUB }

int sem_destroy(sem_t *sem) { STUB }

int sem_wait(sem_t *sem) { STUB }

int sem_trywait(sem_t *sem) { STUB }

int sem_timedwait(sem_t *sem, const struct timespec *abs_timeout) { STUB }

int sem_post(sem_t *sem) { STUB }

int pthread_key_create(pthread_key_t *key, void (*destructor)(void *)) { STUB }

int pthread_key_delete(pthread_key_t key) { STUB }

void *pthread_getspecific(pthread_key_t key) { STUB }
int pthread_setspecific(pthread_key_t key, const void *value) { STUB }

int pthread_kill(pthread_t thread, int sig) { STUB }

#include <time.h>
int pthread_getcpuclockid(pthread_t thread, clockid_t *clock_id) { STUB }

int pthread_mutex_lock(pthread_mutex_t *mutex) { STUB }
int pthread_mutex_trylock(pthread_mutex_t *mutex) { STUB }
int pthread_mutex_unlock(pthread_mutex_t *mutex) { STUB }

int pthread_mutex_destroy(pthread_mutex_t *mutex) { STUB }
int pthread_mutex_init(pthread_mutex_t *restrict mutex,
                       const pthread_mutexattr_t *restrict attr) {
  STUB
}
int pthread_cond_broadcast(pthread_cond_t *cond) { STUB }
int pthread_cond_signal(pthread_cond_t *cond) { STUB }

int pthread_condattr_destroy(pthread_condattr_t *attr) { STUB }
int pthread_condattr_init(pthread_condattr_t *attr) { STUB }

int pthread_cond_timedwait(pthread_cond_t *restrict cond,
                           pthread_mutex_t *restrict mutex,
                           const struct timespec *restrict abstime) {
  STUB
}
int pthread_cond_wait(pthread_cond_t *restrict cond,
                      pthread_mutex_t *restrict mutex) {
  STUB
}

void pthread_exit(void *retval) { STUB }

int pthread_cond_destroy(pthread_cond_t *cond) { STUB }
int pthread_cond_init(pthread_cond_t *restrict cond,
                      const pthread_condattr_t *restrict attr) {
  STUB
}
