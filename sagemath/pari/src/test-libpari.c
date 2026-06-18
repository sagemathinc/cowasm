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

static int check_error_recovery(void) {
  int caught_inverse_error = 0;

  pari_CATCH(e_INV) {
    GEN error = pari_err_last();
    caught_inverse_error = error && err_get_num(error) == e_INV;
  }
  pari_TRY {
    (void)gp_read_str("1/0");
  }
  pari_ENDCATCH;

  if (!caught_inverse_error) {
    fprintf(stderr, "PARI inverse error was not caught as e_INV\n");
    return 0;
  }

  return check_expression_long("13*17", 221);
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
  ok = ok && check_expression_long("factorback(factor(360))", 360);
  ok = ok && check_expression_long("znorder(Mod(2,101))", 100);
  ok = ok && check_expression_long("polisirreducible(x^5 - x - 1)", 1);
  ok = ok && check_expression_long("ellcard(ellinit([0,-1]), 101)", 102);
  ok = ok && check_error_recovery();

  pari_close();

  if (!ok) {
    return 1;
  }

  printf("libpari result: %ld primepi=1229 factorback=360 znorder=100 "
         "irreducible=1 ellcard=102 recovered=221 caught=e_INV\n",
         product);
  return 0;
}
