#include <pari/pari.h>

long pari_add(long a, long b) {
  pari_init(1000000, 100000);
  GEN x = stoi(a);
  GEN y = stoi(b);
  GEN z = gadd(x, y);
  return itos(z);
}
