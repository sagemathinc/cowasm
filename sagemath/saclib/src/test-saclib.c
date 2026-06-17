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

  puts("saclib-ok abs=42 sign=-1 even=1 eval=17 tprod-deg=2 tprod-lead=14 tprod-eval=78");
  return 0;
}
