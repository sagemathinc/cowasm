/* Inspired by https://github.com/mpdn/unthread */

#include <stdio.h>
#include "threads.h"

#define true 1

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

static struct pthread_fiber main_thread = {
    .id = 1,
    .state = RUNNING,
    .attr = DEFAULT_ATTR_INITIALIZER,
    .cancel_state = PTHREAD_CANCEL_ENABLE,
    .cancel_type = PTHREAD_CANCEL_DEFERRED,
    .sched_policy = SCHED_OTHER,
    .list_index = {-1, -1},
};

// Current running thread
static pthread_t current = 1;

static const pthread_condattr_t pthread_condattr_default = {
    .pshared = PTHREAD_PROCESS_PRIVATE,
    .initialized = true,
    .clock_id = CLOCK_MONOTONIC,
};

int pthread_cond_init(pthread_cond_t *cond, const pthread_condattr_t *attr) {
  printf("pthread_cond_init - c implementation\n");
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
  printf("pthread_cond_signal - c implementation\n");
  // just do nothing - since we never block
  return 0;
}

int pthread_condattr_init(pthread_condattr_t *attr) {
  printf("pthread_condattr_init - c implementation\n");
  *attr = pthread_condattr_default;
  return 0;
}

int pthread_condattr_setclock(pthread_condattr_t *attr, clockid_t clock_id) {
  printf("pthread_condattr_setclock - c implementation\n");
  attr->clock_id = clock_id;
  return 0;
}

void *pthread_getspecific(pthread_key_t key) {
  printf("pthread_getspecific - c implementation\n");
  if (current->tls.len == 0) {
    return 0;
  }

  size_t mask = current->tls.cap - 1;
  size_t index = key.id & mask;
  size_t dist = 0;

  for (;;) {
    struct tls_entry entry = current->tls.entries[index];
    size_t probe_distance = (index - entry.id) & mask;

    if (entry.id == key.id) {
      return entry.value;
    } else if (entry.id == 0 || probe_distance <= dist) {
      return NULL;
    }

    dist++;
    index++;
    index &= mask;
  }
}

int pthread_key_create(pthread_key_t *key, void (*destructor)(void *)) {
  printf("pthread_key_create - c implementation\n");
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
  printf("pthread_mutex_init - c implementation\n");
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
  printf("pthread_mutex_lock - c implementation\n");
  return 0;
}

int pthread_mutex_unlock(pthread_mutex_t *mutex) { return 0; }

pthread_t pthread_self() { return current; }

// The fraction determining when hashtables should grow. Unthread uses Robin
// Hood hashtables, so they should perform pretty well even for high load.
static const size_t HASH_LOAD_NOM = 4;
static const size_t HASH_LOAD_DENOM = 5;

static void tls_insert_base(struct tls *tls, struct tls_entry entry) {
  size_t mask = tls->cap - 1;
  size_t index = entry.id & mask;
  size_t dist = 0;

  for (;;) {
    struct tls_entry *table_entry = &tls->entries[index];

    if (table_entry->id == 0) {
      *table_entry = entry;
      tls->len++;

      break;
    } else if (table_entry->id == entry.id) {
      if (table_entry->value == NULL) {
        tls->len++;
      }

      *table_entry = entry;
      break;
    }

    size_t probe_distance = (index - table_entry->id) & mask;

    if (dist > probe_distance) {
      if (table_entry->value == NULL) {
        *table_entry = entry;
        tls->len++;
      }

      struct tls_entry tmp = *table_entry;
      *table_entry = entry;
      entry = tmp;
      dist = probe_distance;
    }

    index = (index + 1) & mask;
    dist++;
  }
}

static void tls_grow(struct tls *tls) {
  size_t new_cap = tls->cap * 2;

  if (new_cap < 16) {
    new_cap = 16;
  }

  struct tls new_tls = (struct tls){
      .entries = calloc(new_cap, sizeof(struct tls_entry)),
      .cap = new_cap,
      .len = 0,
  };

  for (size_t i = 0; i < tls->cap; i++) {
    if (tls->entries[i].id != 0) {
      tls_insert_base(&new_tls, tls->entries[i]);
    }
  }

  free(current->tls.entries);
  current->tls = new_tls;
}

static void tls_remove(struct tls *tls, unsigned int id) {
  size_t mask = tls->cap - 1;
  size_t index = id & mask;
  size_t dist = 0;

  for (;;) {
    struct tls_entry *table_entry = &tls->entries[index];

    if (table_entry->id == 0) {
      break;
    } else if (table_entry->id == id) {
      if (table_entry->value != NULL) {
        tls->len--;
      }

      table_entry->value = NULL;
      break;
    }

    size_t probe_distance = (index - table_entry->id) & mask;

    if (dist > probe_distance) {
      break;
    }

    index = (index + 1) & mask;
    dist++;
  }
}

int pthread_setspecific(pthread_key_t key, const void *value) {
  if (current->tls.cap * HASH_LOAD_NOM <= current->tls.len * HASH_LOAD_DENOM) {
    tls_grow(&current->tls);
  }

  if (value != NULL) {
    tls_insert_base(&current->tls, (struct tls_entry){
                                       .id = key.id,
                                       .value = (void *)value,
                                       .destructor = key.destructor,
                                   });
  } else {
    tls_remove(&current->tls, key.id);
  }

  return 0;
}
