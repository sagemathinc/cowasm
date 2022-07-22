/* We put code in here that is easier to write in C than zig. */
#include "Python.h"
#include <signal.h>

// It is important to define this function to actually do something, rather
// than be a pure stub function, in the case we are asking for what the
// signal handler is.  This is requested in Python's PyOS_getsig, and if
// we just don't set it, then the handler is considered random nonsense.
// That's not good, since then the proper handlers from python, e.g., the
// one for sigint, don't get setup in Python's signal_get_set_handlers function.
int sigaction(int signum, const struct sigaction *restrict act,
  struct sigaction *restrict oldact) {
  if(act == NULL && oldact != NULL) { // getting the signal info.
    oldact->sa_handler = SIG_DFL; // only this matters for python
    oldact->sa_mask = 0;
    oldact->sa_flags = 0;
  }
  return 0;
}


