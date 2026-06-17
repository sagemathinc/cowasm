#include <mpfr.h>
#include <stdio.h>
#include <string.h>

static int check_string(mpfr_t x, const char *format, const char *expected) {
  char buf[128];

  mpfr_snprintf(buf, sizeof(buf), format, x);
  if (strcmp(buf, expected) != 0) {
    fprintf(stderr, "unexpected MPFR value: got %s, expected %s\n", buf,
            expected);
    return 1;
  }

  return 0;
}

int main(void) {
  mpfr_t x, y, z;
  mpz_t n;
  int inex_down, inex_up;
  int status = 1;

  mpfr_init2(x, 192);
  mpfr_init2(y, 192);
  mpfr_init2(z, 8);
  mpz_init(n);

  mpfr_const_pi(x, MPFR_RNDN);
  if (check_string(x, "%.40RNf",
                   "3.1415926535897932384626433832795028841972")) {
    goto cleanup;
  }

  mpfr_set_ui(x, 1, MPFR_RNDN);
  mpfr_exp(x, x, MPFR_RNDN);
  if (check_string(x, "%.40RNf",
                   "2.7182818284590452353602874713526624977572")) {
    goto cleanup;
  }

  mpfr_set_ui(x, 2, MPFR_RNDN);
  mpfr_log(x, x, MPFR_RNDN);
  if (check_string(x, "%.40RNf",
                   "0.6931471805599453094172321214581765680755")) {
    goto cleanup;
  }

  mpfr_set_ui(x, 2, MPFR_RNDN);
  mpfr_sqrt(x, x, MPFR_RNDN);
  if (check_string(x, "%.40RNf",
                   "1.4142135623730950488016887242096980785697")) {
    goto cleanup;
  }

  mpfr_set_ui(x, 21, MPFR_RNDN);
  mpfr_div_ui(x, x, 7, MPFR_RNDN);
  if (mpfr_cmp_ui(x, 3) != 0) {
    goto cleanup;
  }

  mpfr_flags_clear(MPFR_FLAGS_ALL);
  mpfr_set_ui(x, 1, MPFR_RNDN);
  inex_down = mpfr_div_ui(x, x, 10, MPFR_RNDD);
  if (inex_down >= 0 || !mpfr_inexflag_p()) {
    goto cleanup;
  }

  mpfr_flags_clear(MPFR_FLAGS_ALL);
  mpfr_set_ui(y, 1, MPFR_RNDN);
  inex_up = mpfr_div_ui(y, y, 10, MPFR_RNDU);
  if (inex_up <= 0 || !mpfr_inexflag_p() || mpfr_cmp(x, y) >= 0) {
    goto cleanup;
  }

  mpz_ui_pow_ui(n, 2, 100);
  mpfr_set_z(x, n, MPFR_RNDN);
  mpfr_sqrt(x, x, MPFR_RNDN);
  if (mpfr_cmp_ui_2exp(x, 1, 50) != 0) {
    goto cleanup;
  }

  mpfr_set_ui_2exp(z, 1, -1, MPFR_RNDN);
  mpfr_add(z, z, z, MPFR_RNDN);
  if (mpfr_cmp_ui(z, 1) != 0) {
    goto cleanup;
  }

  puts("mpfr-ok pi exp log sqrt exact-div directed-rounding flags mpz");
  status = 0;

cleanup:
  mpfr_clear(x);
  mpfr_clear(y);
  mpfr_clear(z);
  mpz_clear(n);
  mpfr_free_cache();
  return status;
}
