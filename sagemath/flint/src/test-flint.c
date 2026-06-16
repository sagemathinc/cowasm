#include <flint/flint.h>
#include <flint/acb.h>
#include <flint/arb.h>
#include <flint/fmpz.h>
#include <flint/fmpz_poly.h>

#include <stdio.h>
#include <string.h>

int main(void) {
  fmpz_t n;
  fmpz_poly_t poly;
  arb_t pi;
  arb_t sin_pi;
  acb_t z;
  acb_t z_squared;
  char *poly_str;
  char *pi_str;
  int ok;

  fmpz_init(n);
  fmpz_poly_init(poly);
  arb_init(pi);
  arb_init(sin_pi);
  acb_init(z);
  acb_init(z_squared);

  fmpz_fac_ui(n, 30);
  fmpz_print(n);
  putchar('\n');

  fmpz_poly_set_coeff_ui(poly, 0, 1);
  fmpz_poly_set_coeff_ui(poly, 1, 2);
  fmpz_poly_set_coeff_ui(poly, 2, 1);
  poly_str = fmpz_poly_get_str(poly);
  puts(poly_str);

  arb_const_pi(pi, 128);
  arb_sin(sin_pi, pi, 128);
  pi_str = arb_get_str(pi, 24, ARB_STR_NO_RADIUS);
  puts(pi_str);

  acb_set_si_si(z, 1, 1);
  acb_mul(z_squared, z, z, 128);

  ok = fmpz_cmp_ui(n, 0) > 0 && strcmp(poly_str, "3  1 2 1") == 0;
  ok = ok && arb_contains_zero(sin_pi);
  ok = ok && arb_contains_si(acb_realref(z_squared), 0);
  ok = ok && arb_contains_si(acb_imagref(z_squared), 2);

  flint_free(poly_str);
  flint_free(pi_str);
  acb_clear(z_squared);
  acb_clear(z);
  arb_clear(sin_pi);
  arb_clear(pi);
  fmpz_poly_clear(poly);
  fmpz_clear(n);
  flint_cleanup();

  return ok ? 0 : 1;
}
