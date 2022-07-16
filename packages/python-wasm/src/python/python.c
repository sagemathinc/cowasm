#include "Python.h"
#include <stdio.h>

// This doesn't do anything useful.
int run_interactive_one(void) {
  printf("opening fopen\n");
  printf("isatty = %d\n", isatty((int)fileno(stdin)));
  printf("calling PyRun_InteractiveOne\n");
  int r = PyRun_InteractiveOne(stdin, "<stdin>");
  printf("got %d\n", r);
  return r;
}

