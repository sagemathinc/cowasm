#include <stdio.h>
#include <stdlib.h>

#include <e-antic/renf.h>
#include <e-antic/renf_elem.h>

int main(void) {
  fmpq_t two;
  renf_t field;
  renf_t cubic_field;
  renf_elem_t gen;
  renf_elem_t cubic_gen;
  renf_elem_t square;
  renf_elem_t cube;
  renf_elem_t relation;
  renf_elem_t inverse;
  renf_elem_t product;
  renf_elem_t quotient;
  fmpz_t floor_gen;
  fmpz_t ceil_cubic_gen;
  char *field_text = NULL;
  char *gen_text = NULL;
  int relation_ok;
  int cubic_relation_ok;
  int inverse_ok;
  int quotient_ok;
  int ordering_ok;
  int sign;
  int ok;

  fmpq_init(two);
  fmpq_set_si(two, 2, 1);
  renf_init_nth_root_fmpq(field, two, 2, 128);
  renf_init_nth_root_fmpq(cubic_field, two, 3, 128);

  renf_elem_init(gen, field);
  renf_elem_init(square, field);
  renf_elem_init(relation, field);
  renf_elem_init(cubic_gen, cubic_field);
  renf_elem_init(cube, cubic_field);
  renf_elem_init(inverse, cubic_field);
  renf_elem_init(product, cubic_field);
  renf_elem_init(quotient, cubic_field);
  fmpz_init(floor_gen);
  fmpz_init(ceil_cubic_gen);

  renf_elem_gen(gen, field);
  renf_elem_pow(square, gen, 2, field);
  renf_elem_sub_si(relation, square, 2, field);
  renf_elem_floor(floor_gen, gen, field);

  relation_ok = renf_elem_is_zero(relation, field);
  sign = renf_elem_sgn(gen, field);
  field_text = renf_get_str(field, "a", 32);
  gen_text = renf_elem_get_str_pretty(
      gen, "a", field, 32, EANTIC_STR_ALG | EANTIC_STR_ARB);

  renf_elem_gen(cubic_gen, cubic_field);
  renf_elem_pow(cube, cubic_gen, 3, cubic_field);
  renf_elem_sub_si(cube, cube, 2, cubic_field);
  renf_elem_inv(inverse, cubic_gen, cubic_field);
  renf_elem_mul(product, cubic_gen, inverse, cubic_field);
  renf_elem_div(quotient, cubic_gen, cubic_gen, cubic_field);
  renf_elem_ceil(ceil_cubic_gen, cubic_gen, cubic_field);

  cubic_relation_ok = renf_elem_is_zero(cube, cubic_field);
  inverse_ok = renf_elem_is_one(product, cubic_field);
  quotient_ok = renf_elem_is_one(quotient, cubic_field);
  ordering_ok = renf_elem_cmp_si(cubic_gen, 1, cubic_field) > 0 &&
                renf_elem_cmp_si(cubic_gen, 2, cubic_field) < 0 &&
                fmpz_equal_si(ceil_cubic_gen, 2) &&
                !renf_elem_is_rational(cubic_gen, cubic_field);

  ok = renf_degree(field) == 2 && relation_ok && sign > 0 &&
       fmpz_equal_si(floor_gen, 1) && renf_degree(cubic_field) == 3 &&
       cubic_relation_ok && inverse_ok && quotient_ok && ordering_ok;

  printf(
      "e-antic-ok degree=%ld relation=%d sign=%d floor=%ld "
      "cubic-degree=%ld cubic-relation=%d inverse=%d quotient=%d "
      "ordering=%d field=%s gen=%s\n",
      (long)renf_degree(field), relation_ok, sign, fmpz_get_si(floor_gen),
      (long)renf_degree(cubic_field), cubic_relation_ok, inverse_ok,
      quotient_ok, ordering_ok,
      field_text, gen_text);

  flint_free(field_text);
  flint_free(gen_text);
  fmpz_clear(ceil_cubic_gen);
  fmpz_clear(floor_gen);
  renf_elem_clear(quotient, cubic_field);
  renf_elem_clear(product, cubic_field);
  renf_elem_clear(inverse, cubic_field);
  renf_elem_clear(cube, cubic_field);
  renf_elem_clear(cubic_gen, cubic_field);
  renf_elem_clear(relation, field);
  renf_elem_clear(square, field);
  renf_elem_clear(gen, field);
  renf_clear(cubic_field);
  renf_clear(field);
  fmpq_clear(two);

  return ok ? 0 : 1;
}
