#ifndef COWASM_CPYTHON_SCHED_H
#define COWASM_CPYTHON_SCHED_H

#include_next <sched.h>

/*
 * Zig 0.10's WASI sched.h hides sched_param behind
 * __wasilibc_unmodified_upstream even though spawn.h exposes the POSIX spawn
 * scheduling flags.  CPython consequently needs the public POSIX shape when
 * it compiles os.posix_spawn() support against the pinned Zig sysroot.
 */
#ifndef __wasilibc_unmodified_upstream
struct sched_param {
    int sched_priority;
};
#endif

#endif
