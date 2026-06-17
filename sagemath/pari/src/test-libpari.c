#include <pari/pari.h>
#include <stdio.h>

static int check_expression_long(const char *expression, long expected) {
  GEN value = gp_read_str(expression);
  long result = itos(value);

  if (result != expected) {
    fprintf(stderr, "unexpected PARI result for %s: %ld\n", expression,
            result);
    return 0;
  }
  return 1;
}

int main(void) {
  int ok = 1;

  pari_init(8000000, 2);

  GEN value = stoi(7);
  value = gmulgs(value, 17);
  value = gmulgs(value, 17);

  long product = itos(value);
  ok = ok && product == 2023;
  if (product != 2023) {
    fprintf(stderr, "unexpected PARI product result: %ld\n", product);
  }

  ok = ok && check_expression_long("primepi(10000)", 1229);
  ok = ok && check_expression_long("polisirreducible(x^5 - x - 1)", 1);
  ok = ok && check_expression_long("ellcard(ellinit([0,-1]), 101)", 102);

  pari_close();

  if (!ok) {
    return 1;
  }

  printf("libpari result: %ld primepi=1229 irreducible=1 ellcard=102\n",
         product);
  return 0;
}
