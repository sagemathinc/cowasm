#include <pari/pari.h>

void sage_pari_init(void) { pari_init(1000000, 100000); }

long sage_pari_add(long a, long b) {
  pari_sp av = avma;
  GEN x = stoi(a);
  GEN y = stoi(b);
  GEN z = gadd(x, y);
  const long r = itos(z);
  avma = av;
  return r;
}

void sage_pari_exec(void) {
  char* s = "ellan(ellinit([1,2,3,4,5]),1000)";
  pari_sp av = avma;
  // GEN gp_read_str_multiline(const char *s, char *last)
  GEN x = gp_read_str_multiline(s, NULL);
  output(x);
  avma = av;
}