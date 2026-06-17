#include "saclib.h"

#include <stdio.h>

int main(void) {
  Word absolute;
  Word sign;
  Word even;

  absolute = ABS(-42);
  sign = SIGN(-42);
  even = EVEN(1024);

  if (absolute != 42) {
    return 1;
  }
  if (sign != -1) {
    return 2;
  }
  if (even != 1) {
    return 3;
  }

  puts("saclib-ok abs=42 sign=-1 even=1");
  return 0;
}
