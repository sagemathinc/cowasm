#include "app.h"
#include <stdio.h>
#include <math.h>


EXPORTED_SYMBOL
void hello(void) {
  // use a function from libc
  printf("hello using libc: %f\n", sin(1));
}
