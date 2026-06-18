#include "saclib.h"

#include <stdio.h>

int main(void) {
  Word stack_bottom;
  Word absolute;
  Word sign;
  Word even;
  Word a;
  Word b;
  Word truncated_product;
  Word eval_a;
  Word product_degree;
  Word product_lead;
  Word product_eval;
  Word c;
  Word full_product;
  Word shared_product;
  Word gcd;
  Word left_cofactor;
  Word right_cofactor;
  Word gcd_degree;
  Word gcd_eval;
  Word left_eval;
  Word right_eval;
  Word array;
  Word array_list;
  Word array_length;
  Word array_first;
  Word array_second;
  Word array_third;

  absolute = ABS(-42);
  sign = SIGN(-42);
  even = EVEN(1024);

  if (absolute != 42) {
    return 1;
  }
  if (sign != -1) {
    return 2;
  }
  if (even != 1) {
    return 3;
  }

  BEGINSACLIB(&stack_bottom);

  /* A = 3*x^2 + 2*x + 1 and B = x + 4. */
  a = COMP2(0, 1, NIL);
  a = COMP2(1, 2, a);
  a = COMP2(2, 3, a);
  b = COMP2(0, 4, NIL);
  b = COMP2(1, 1, b);

  eval_a = IUPEVAL(a, 2);
  truncated_product = IUPTPR(3, a, b);
  product_degree = PDEG(truncated_product);
  product_lead = PLDCF(truncated_product);
  product_eval = IUPEVAL(truncated_product, 2);

  /* C = x + 1.  The full products share exactly the factor B. */
  c = COMP2(0, 1, NIL);
  c = COMP2(1, 1, c);
  full_product = IPPROD(1, a, b);
  shared_product = IPPROD(1, b, c);
  IPGCDC(1, full_product, shared_product, &gcd, &left_cofactor, &right_cofactor);
  gcd_degree = PDEG(gcd);
  gcd_eval = IUPEVAL(gcd, 2);
  left_eval = IUPEVAL(left_cofactor, 2);
  right_eval = IUPEVAL(right_cofactor, 2);

  array = GCAMALLOC(3, GC_CHECK);
  GCASET(array, 0, a);
  GCASET(array, 1, b);
  GCASET(array, 2, c);
  array_list = GCATL(array, 3);
  array_length = LENGTH(array_list);
  array_first = IUPEVAL(FIRST(array_list), 2);
  array_second = IUPEVAL(SECOND(array_list), 2);
  array_third = IUPEVAL(THIRD(array_list), 2);
  GCAFREE(array);

  ENDSACLIB(SAC_FREEMEM);

  if (eval_a != 17) {
    return 4;
  }
  if (product_degree != 2) {
    return 5;
  }
  if (product_lead != 14) {
    return 6;
  }
  if (product_eval != 78) {
    return 7;
  }
  if (gcd_degree != 1) {
    return 8;
  }
  if (gcd_eval != 6) {
    return 9;
  }
  if (left_eval != 17) {
    return 10;
  }
  if (right_eval != 3) {
    return 11;
  }
  if (array_length != 3) {
    return 12;
  }
  if (array_first != 17) {
    return 13;
  }
  if (array_second != 6) {
    return 14;
  }
  if (array_third != 3) {
    return 15;
  }

  puts("saclib-ok abs=42 sign=-1 even=1 eval=17 tprod-deg=2 tprod-lead=14 tprod-eval=78 gcd-deg=1 gcd-eval=6 cofactors=17,3 gca-len=3 gca-evals=17,6,3");
  return 0;
}
