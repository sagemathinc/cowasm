#include <flint/flint.h>
#include <flint/fmpz.h>
#include <flint/fmpz_poly.h>

#include <stdio.h>
#include <string.h>

int main(void) {
  fmpz_t n;
  fmpz_poly_t poly;
  char *poly_str;
  int ok;

  fmpz_init(n);
  fmpz_poly_init(poly);

  fmpz_fac_ui(n, 30);
  fmpz_print(n);
  putchar('\n');

  fmpz_poly_set_coeff_ui(poly, 0, 1);
  fmpz_poly_set_coeff_ui(poly, 1, 2);
  fmpz_poly_set_coeff_ui(poly, 2, 1);
  poly_str = fmpz_poly_get_str(poly);
  puts(poly_str);

  ok = fmpz_cmp_ui(n, 0) > 0 && strcmp(poly_str, "3  1 2 1") == 0;

  flint_free(poly_str);
  fmpz_poly_clear(poly);
  fmpz_clear(n);
  flint_cleanup();

  return ok ? 0 : 1;
}
