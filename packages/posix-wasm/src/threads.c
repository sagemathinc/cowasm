/*
The goal of this is a very minimal version of enough of the pthread api
to start Python, without it actually using any real threading capabilities.
This is necessary because there is no option to build modern Python without
pthreads (that used to be possible long ago).

Inspired by https://github.com/mpdn/unthread

NOTE: I had initially carried over a minimal implementation of pthread_mutex_init,
but that actually breaks in Python/ceval_gil.h in the function
create_gil, where the line MUTEX_INIT(gil->switch_mutex) somehow makes
it so the gil never gets set.    That's fine - this is not meant to work
like actual pthreads yet!


NOTE: Right after I spent like two days writing this something very
similar popped up in Python itself!   https://github.com/python/cpython/pull/95234
ARGH, that's so annoying, but obviously also good.  Their implementation is more
minimal, but maybe that is better.  That said, these don't build due to
incompatibility with libc-wasm-zig, so we're sticking with our own pthreads.
*/

#include <stdio.h>
#include "threads.h"
#include "public.h"

//#define debug printf

#define debug

#define DEFAULT_ATTR_INITIALIZER                                              \
  {                                                                           \
    {                                                                         \
      .initialized = true, .detach_state = PTHREAD_CREATE_JOINABLE,           \
      .guard_size = 0, .inherit_sched = PTHREAD_INHERIT_SCHED,                \
      .scope = PTHREAD_SCOPE_PROCESS, .sched_param = (struct sched_param){},  \
      .sched_policy = SCHED_OTHER, .stack_addr = NULL, .stack_size = 1 << 20, \
    }                                                                         \
  }

static const union pthread_attr_t default_attr = DEFAULT_ATTR_INITIALIZER;

#define MAIN_ID 1
static struct pthread_fiber main_thread = {
    .id = MAIN_ID,
    .state = RUNNING,
    .attr = DEFAULT_ATTR_INITIALIZER,
    .cancel_state = PTHREAD_CANCEL_ENABLE,
    .cancel_type = PTHREAD_CANCEL_DEFERRED,
    .sched_policy = SCHED_OTHER,
    .list_index = {-1, -1},
};

// Current running thread
static pthread_t current = MAIN_ID;

static const pthread_condattr_t pthread_condattr_default = {
    .pshared = PTHREAD_PROCESS_PRIVATE,
    .initialized = true,
    .clock_id = CLOCK_MONOTONIC,
};

int pthread_cond_init(pthread_cond_t *cond, const pthread_condattr_t *attr) {
  debug("pthread_cond_init - c implementation\n");
  return 0;
}
PUBLIC(pthread_cond_init)

// The pthread_cond_signal() call unblocks at least one of the threads that are blocked on the specified condition variable cond (if any threads are blocked on cond).
int pthread_cond_signal(pthread_cond_t *cond) {
  debug("pthread_cond_signal - c implementation\n");
  // just do nothing - since we never block
  return 0;
}
PUBLIC(pthread_cond_signal)

int pthread_condattr_init(pthread_condattr_t *attr) {
  debug("pthread_condattr_init - c implementation\n");
  *attr = pthread_condattr_default;
  return 0;
}
PUBLIC(pthread_condattr_init)

int pthread_condattr_setclock(pthread_condattr_t *attr, clockid_t clock_id) {
  debug("pthread_condattr_setclock - c implementation\n");
  attr->clock_id = clock_id;
  return 0;
}
PUBLIC(pthread_condattr_setclock)

#define SIZE 1000
static void *values[SIZE];
static pthread_key_t keys[SIZE];
static int nkeys = 0;

void *pthread_getspecific(pthread_key_t key) {
  debug("pthread_getspecific - key=%d\n", key.id);
  for (int i = 0; i < nkeys; i++) {
    if (keys[i].id == key.id) {
      debug("pthread_getspecific - return value=%p\n", values[i]);
      return values[i];
    }
  }
  return 0;
}
PUBLIC(pthread_getspecific)

int pthread_setspecific(pthread_key_t key, const void *value) {
  debug("pthread_setspecific - c implementation, key=%d, value=%p\n", key.id, value);
  for (int i = 0; i < nkeys; i++) {
    if (keys[i].id == key.id) {
      debug("pthread_setspecific - changing key number %d\n", i);
      values[i] = value;
      return 0;
    }
  }
  nkeys += 1;
  debug("pthread_setspecific; added a new key so now there are %d\n", nkeys);
  if (nkeys >= SIZE) {
    printf("BOOM! ran out of pthread keys!");
  }
  keys[nkeys - 1] = key;
  values[nkeys - 1] = value;
  return 0;
}
PUBLIC(pthread_setspecific)

int pthread_key_create(pthread_key_t *key, void (*destructor)(void *)) {
  debug("pthread_key_create - c implementation\n");
  size_t id;

  static size_t next_key_id = 1;

  do {
    id = next_key_id++;
  } while (id == 0);

  *key = (pthread_key_t){
      .id = id,
      .destructor = destructor,
      .initialized = true,
  };

  return 0;
}
PUBLIC(pthread_key_create)


// The pthread_mutex_init() function initialises the mutex referenced by mutex with attributes specified by attr. If attr is NULL, the default mutex attributes are used; the effect is the same as passing the address of a default mutex attributes object. Upon successful initialisation, the state of the mutex becomes initialised and unlocked.
int pthread_mutex_init(pthread_mutex_t *mutex,
                       const pthread_mutexattr_t *attr) {
  debug("pthread_mutex_init - c implementation\n");
  return 0;
}
PUBLIC(pthread_mutex_init)

// The mutex object referenced by mutex is locked by calling pthread_mutex_lock(). If the mutex is already locked, the calling thread blocks until the mutex becomes available. This operation returns with the mutex object referenced by mutex in the locked state with the calling thread as its owner.
int pthread_mutex_lock(pthread_mutex_t *mutex) {
  //debug("pthread_mutex_lock - c implementation\n");
  return 0;
}
PUBLIC(pthread_mutex_lock)

int pthread_mutex_unlock(pthread_mutex_t *mutex) {
  //debug("pthread_mutex_unlock - c implementation\n");
  return 0;
}
PUBLIC(pthread_mutex_unlock)

// The pthread_self() function returns the thread ID of the calling thread.
pthread_t pthread_self() {
  debug("pthread_self - c implementation\n");
  return current;
}
PUBLIC(pthread_self)
