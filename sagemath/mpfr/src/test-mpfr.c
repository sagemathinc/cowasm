#include <mpfr.h>
#include <stdio.h>
#include <string.h>

int main(void) {
  mpfr_t x;
  char buf[128];

  mpfr_init2(x, 192);
  mpfr_const_pi(x, MPFR_RNDN);
  mpfr_snprintf(buf, sizeof(buf), "%.40RNf", x);
  puts(buf);

  if (strcmp(buf, "3.1415926535897932384626433832795028841972") != 0) {
    mpfr_clear(x);
    return 1;
  }

  mpfr_set_ui(x, 21, MPFR_RNDN);
  mpfr_div_ui(x, x, 7, MPFR_RNDN);
  if (mpfr_cmp_ui(x, 3) != 0) {
    mpfr_clear(x);
    return 1;
  }

  mpfr_clear(x);
  mpfr_free_cache();
  return 0;
}
