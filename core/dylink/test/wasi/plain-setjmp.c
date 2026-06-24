#include "app.h"

extern int setjmp(void *env);

EXPORTED_SYMBOL
int plain_setjmp_returns_zero(void) {
  int env[64] = {0};
  return setjmp(env) == 0;
}
