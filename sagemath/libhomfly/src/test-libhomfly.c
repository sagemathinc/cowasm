#include <stdio.h>
#include <string.h>

#include "homfly.h"

static int has_term(const Poly *poly, sb2 l, sb2 m, sb4 coef) {
  for (sb4 i = 0; i < poly->len; i++) {
    const Term *term = &poly->term[i];
    if (term->l == l && term->m == m && term->coef == coef) {
      return 1;
    }
  }
  return 0;
}

int main(void) {
  char trefoil[] = "1 6 0 1 1 -1 2 1 0 -1 1 1 2 -1 0 1 1 1 2 1";
  const char *expected = " - L^-4 - 2L^-2 + M^2L^-2";

  char *as_string = homfly_str(trefoil);
  if (strcmp(as_string, expected) != 0) {
    printf("unexpected homfly_str output: %s\n", as_string);
    return 1;
  }

  Poly *as_poly = homfly(trefoil);
  if (as_poly->len != 3 || !has_term(as_poly, -4, 0, -1) ||
      !has_term(as_poly, -2, 0, -2) || !has_term(as_poly, -2, 2, 1)) {
    printf("unexpected homfly polynomial terms: len=%ld\n", as_poly->len);
    return 1;
  }

  printf("libhomfly-ok terms=%ld polynomial=%s\n", as_poly->len, as_string);
  return 0;
}
