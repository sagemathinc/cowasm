#ifndef WASMPOSIXTHREADS
#define WASMPOSIXTHREADS

#include <time.h>
#include <stdbool.h>

#define SCHED_OTHER 0
#define PTHREAD_CANCEL_ASYNCHRONOUS 1
#define PTHREAD_CANCEL_ENABLE 2
#define PTHREAD_CANCEL_DEFERRED 3
#define PTHREAD_CANCEL_DISABLE 4
#define PTHREAD_CREATE_DETACHED 5
#define PTHREAD_CREATE_JOINABLE 6
#define PTHREAD_EXPLICIT_SCHED 7
#define PTHREAD_INHERIT_SCHED 8
#define PTHREAD_MUTEX_DEFAULT 9
#define PTHREAD_MUTEX_ERRORCHECK 10
#define PTHREAD_MUTEX_NORMAL 11
#define PTHREAD_MUTEX_RECURSIVE 12
#define PTHREAD_MUTEX_ROBUST 13
#define PTHREAD_MUTEX_STALLED 14
#define PTHREAD_PRIO_INHERIT 15
#define PTHREAD_PRIO_NONE 16
#define PTHREAD_PRIO_PROTECT 17
#define PTHREAD_PROCESS_SHARED 18
#define PTHREAD_PROCESS_PRIVATE 19
#define PTHREAD_SCOPE_PROCESS 20
#define PTHREAD_SCOPE_SYSTEM 21
#define PTHREAD_BARRIER_SERIAL_THREAD 22

/* Data structure to describe a process' schedulability.  */
// This struct is copied from zig's
// lib/libc/include/generic-glibc/bits/types/struct_sched_param.h which is
// copied from glibc.
// We do this because unthread had
//   #include <bits/types/struct_sched_param.h>
// which is including something from glibc, which is NOT in musl.
struct sched_param {
  int sched_priority;
};

// pthread_attr_t is defined as a union somewhere in some glibc header, so we
// pretend its a union here as well.
union pthread_attr_t {
  struct {
    int initialized;
    int detach_state;
    size_t guard_size;
    int inherit_sched;
    int scope;
    struct sched_param sched_param;
    int sched_policy;
    void **stack_addr;
    size_t stack_size;
  } data;
};

typedef struct {
  int initialized;
  int pshared;
  clockid_t clock_id;
} pthread_condattr_t;

typedef struct pthread_fiber *pthread_t;

// We would rather not expose these internals, but C does not leave us much
// choice unless we want to heap allocate each of these.


struct pthread_fiber;
struct pthread_list {
  size_t len;
  size_t cap;
  union {
    // Store a small list inline or a large list on the heap. Possibly an
    // unnecessary micro-optimization, but eh.
    struct pthread_fiber *small[4];
    struct pthread_fiber **big;
  } threads;
};


typedef struct {
  int initialized;
  struct pthread_fiber *locked_by;
  struct pthread_list waiting;
  int type;
  unsigned int rec_count;
  int prioceiling;
  int robust;
} pthread_mutex_t;


typedef struct {
  int initialized;
  struct pthread_list waiting;
} pthread_cond_t;

#define PTHREAD_EMPTY_LIST_INITIALIZER                     \
  {                                                        \
    .len = 0,                                              \
    .cap = sizeof((struct pthread_list){}.threads.small) / \
           sizeof(*(struct pthread_list){}.threads.small), \
  }

static const struct pthread_list pthread_empty_list =
    PTHREAD_EMPTY_LIST_INITIALIZER;



enum thread_state {
  RUNNING,
};


struct tls_entry {
  size_t id;
  void *value;
  void (*destructor)(void *);
};

struct tls {
  struct tls_entry *entries;
  size_t cap, len;
};

typedef struct pthread_cleanup_t {
  void (*routine)(void *);
  void *arg;
  struct pthread_cleanup_t *prev;
} pthread_cleanup_t;

typedef struct {
  int initialized;
  int prioceiling;
  int protocol;
  int pshared;
  int type;
  int robust;
} pthread_mutexattr_t;

typedef struct {
  int initialized;
  unsigned int id;
  void (*destructor)(void *);
} pthread_key_t;


struct pthread_fiber {
  unsigned int id;

  bool detached;
  bool owns_stack;

  // The index of this thread in the lists we are currently a member of.
  //
  // For example, when waiting on a mutex the current thread is added to the
  // list. Having the index in the thread itself means operations like
  // pop_specific can be implemented in O(1) time.
  //
  // A thread may be a member of the threads_ready list in addition to one
  // other list. This means there are two "slots" for indices, with 0 being for
  // the index in the threads_ready list and 1 for the index in the other list.
  // This is used when blocking on a timed lock, where a thread may both be
  // ready (for the purposes of Unthread) and waiting on a lock at the same
  // time.
  size_t list_index[2];

  // pthread_attr_t used to create this thread.
  union pthread_attr_t attr;

  enum thread_state state;

  union {
    // When blocked on pthread_join, contains the thread being joined
    pthread_t joining;

    // When blocked on pthread_cond_wait and pthread_cond_timedwait, this will
    // be the mutex to acquire when the condition variable is signalled.
    pthread_mutex_t *cond_mutex;

    // When blocked on pthread_barrier_wait, this will be true if the thread
    // was chosen as the serial thread of the barrier.
    bool barrier_serial;

    // When a thread is stopped, this will be the return value of the thread.
    void *retval;

    // When blocked on pthread_rwlock or pthread_rwlock_timedrdlock, this is
    // whether the current thread has been granted reader access.
    bool rwlock_reader;
  } state_data;

  // The thread that this thread is being joined by, or NULL if no thread is
  // currently joining this thread.
  pthread_t joined_by;

  // Thread local storage map for this thread
  struct tls tls;

  int cancel_state;
  int cancel_type;

  // Whether a cancellation signal has been sent. Since the signal is
  // asynchronous, we may act on them much sooner than it is sent.
  bool canceled;

  pthread_cleanup_t *cleanup;

  int sched_policy;
  struct sched_param sched_param;

  __attribute__((aligned(16))) char stack[];
};


#endif