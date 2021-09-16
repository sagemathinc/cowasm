#include <pari/pari.h>
#include <stdio.h>

extern long pari_add(long a, long b);

int main(void) {
  const long r = pari_add(2, 3);
  printf("2+3=%ld\n", r);
}

