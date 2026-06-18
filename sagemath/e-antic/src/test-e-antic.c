#include <stdio.h>
#include <stdlib.h>

#include <e-antic/renf.h>
#include <e-antic/renf_elem.h>

int main(void) {
  fmpq_t two;
  renf_t field;
  renf_elem_t gen;
  renf_elem_t square;
  renf_elem_t relation;
  fmpz_t floor_gen;
  char *field_text = NULL;
  char *gen_text = NULL;
  int relation_ok;
  int sign;
  int ok;

  fmpq_init(two);
  fmpq_set_si(two, 2, 1);
  renf_init_nth_root_fmpq(field, two, 2, 128);

  renf_elem_init(gen, field);
  renf_elem_init(square, field);
  renf_elem_init(relation, field);
  fmpz_init(floor_gen);

  renf_elem_gen(gen, field);
  renf_elem_pow(square, gen, 2, field);
  renf_elem_sub_si(relation, square, 2, field);
  renf_elem_floor(floor_gen, gen, field);

  relation_ok = renf_elem_is_zero(relation, field);
  sign = renf_elem_sgn(gen, field);
  field_text = renf_get_str(field, "a", 32);
  gen_text = renf_elem_get_str_pretty(
      gen, "a", field, 32, EANTIC_STR_ALG | EANTIC_STR_ARB);

  ok = renf_degree(field) == 2 && relation_ok && sign > 0 &&
       fmpz_equal_si(floor_gen, 1);

  printf(
      "e-antic-ok degree=%ld relation=%d sign=%d floor=%ld field=%s gen=%s\n",
      (long)renf_degree(field), relation_ok, sign, fmpz_get_si(floor_gen),
      field_text, gen_text);

  flint_free(field_text);
  flint_free(gen_text);
  fmpz_clear(floor_gen);
  renf_elem_clear(relation, field);
  renf_elem_clear(square, field);
  renf_elem_clear(gen, field);
  renf_clear(field);
  fmpq_clear(two);

  return ok ? 0 : 1;
}
