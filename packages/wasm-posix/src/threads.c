/*
The goal of this is a very minimal version of enough of the pthread api
to start Python, without it actually using any real threading capabilities.
This is necessary because there is no option to build modern Python without
pthreads (that used to be possible long ago).

Inspired by https://github.com/mpdn/unthread
*/

#include <stdio.h>
#include "threads.h"

#define debug printf
//#define debug(s)

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
  if (attr == NULL) {
    attr = &pthread_condattr_default;
  }
  *cond = (pthread_cond_t){
      .waiting = pthread_empty_list,
      .initialized = true,
  };
  return 0;
}

int pthread_cond_signal(pthread_cond_t *cond) {
  debug("pthread_cond_signal - c implementation\n");
  // just do nothing - since we never block
  return 0;
}

int pthread_condattr_init(pthread_condattr_t *attr) {
  debug("pthread_condattr_init - c implementation\n");
  *attr = pthread_condattr_default;
  return 0;
}

int pthread_condattr_setclock(pthread_condattr_t *attr, clockid_t clock_id) {
  debug("pthread_condattr_setclock - c implementation\n");
  attr->clock_id = clock_id;
  return 0;
}

#define SIZE 1000
static void *values[SIZE];
static pthread_key_t keys[SIZE];
static int nkeys = 0;

void *pthread_getspecific(pthread_key_t key) {
  debug("pthread_getspecific - key=%d\n", key.id);
  for (int i = 0; i < nkeys; i++) {
    if (keys[i].id == key.id) {
      debug("pthread_getspecific - return value=%d\n", values[i]);
      return values[i];
    }
  }
  return 0;
}

int pthread_setspecific(pthread_key_t key, const void *value) {
  debug("pthread_setspecific - c implementation, key=%d\n", key.id);
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

static const pthread_mutexattr_t pthread_mutexattr_default = {
    .prioceiling = 0,
    .protocol = PTHREAD_PRIO_INHERIT,
    .pshared = PTHREAD_PROCESS_PRIVATE,
    .type = PTHREAD_MUTEX_DEFAULT,
    .initialized = true,
    .robust = PTHREAD_MUTEX_STALLED,
};

int pthread_mutex_init(pthread_mutex_t *mutex,
                       const pthread_mutexattr_t *attr) {
  debug("pthread_mutex_init - c implementation\n");
  if (attr == NULL) {
    attr = &pthread_mutexattr_default;
  }
  *mutex = (pthread_mutex_t){
      .locked_by = NULL,
      .waiting = pthread_empty_list,
      .initialized = true,
      .type = attr->type == PTHREAD_MUTEX_DEFAULT ? PTHREAD_MUTEX_NORMAL
                                                  : attr->type,
      .rec_count = 0,
      .robust = attr->robust,
  };
  return 0;
}

int pthread_mutex_lock(pthread_mutex_t *mutex) {
  debug("pthread_mutex_lock - c implementation\n");
  return 0;
}

int pthread_mutex_unlock(pthread_mutex_t *mutex) {
  debug("pthread_mutex_unlock - c implementation\n");
  return 0;
}

pthread_t pthread_self() {
  debug("pthread_mutex_unlock - c implementation\n");
  return current;
}
