#include <flint/flint.h>
#include <flint/acb.h>
#include <flint/acb_poly.h>
#include <flint/arb.h>
#include <flint/bernoulli.h>
#include <flint/fmpq.h>
#include <flint/fmpz.h>
#include <flint/fmpz_poly.h>
#include <flint/fmpz_poly_factor.h>

#include <stdio.h>
#include <string.h>

int main(void) {
  fmpz_t n;
  fmpz_t factor_content;
  fmpq_t a;
  fmpq_t b;
  fmpq_t bernoulli;
  fmpq_t rational_sum;
  fmpz_poly_t poly;
  fmpz_poly_t factor_poly;
  fmpz_poly_t factor_product;
  fmpz_poly_t factor_power;
  fmpz_poly_t factor_tmp;
  fmpz_poly_factor_t factorization;
  arb_t two;
  arb_t log_two;
  arb_t exp_log_two;
  arb_t pi;
  arb_t sin_pi;
  acb_t z;
  acb_t z_squared;
  acb_t eval_point;
  acb_t eval_value;
  acb_poly_t ball_poly;
  char *bernoulli_str;
  char *poly_str;
  char *rational_str;
  char *pi_str;
  int ok;
  slong i;

  fmpz_init(n);
  fmpz_init(factor_content);
  fmpq_init(a);
  fmpq_init(b);
  fmpq_init(bernoulli);
  fmpq_init(rational_sum);
  fmpz_poly_init(poly);
  fmpz_poly_init(factor_poly);
  fmpz_poly_init(factor_product);
  fmpz_poly_init(factor_power);
  fmpz_poly_init(factor_tmp);
  fmpz_poly_factor_init(factorization);
  arb_init(two);
  arb_init(log_two);
  arb_init(exp_log_two);
  arb_init(pi);
  arb_init(sin_pi);
  acb_init(z);
  acb_init(z_squared);
  acb_init(eval_point);
  acb_init(eval_value);
  acb_poly_init(ball_poly);

  fmpz_fac_ui(n, 30);
  fmpz_print(n);
  putchar('\n');

  fmpz_poly_set_coeff_ui(poly, 0, 1);
  fmpz_poly_set_coeff_ui(poly, 1, 2);
  fmpz_poly_set_coeff_ui(poly, 2, 1);
  poly_str = fmpz_poly_get_str(poly);
  puts(poly_str);

  fmpq_set_si(a, 1, 3);
  fmpq_set_si(b, 1, 6);
  fmpq_add(rational_sum, a, b);
  rational_str = fmpq_get_str(NULL, 10, rational_sum);
  puts(rational_str);

  bernoulli_fmpq_ui(bernoulli, 12);
  bernoulli_str = fmpq_get_str(NULL, 10, bernoulli);
  puts(bernoulli_str);

  fmpz_poly_set_coeff_si(factor_poly, 0, -1);
  fmpz_poly_set_coeff_si(factor_poly, 2, 1);
  fmpz_poly_factor(factorization, factor_poly);
  fmpz_poly_factor_get_fmpz(factor_content, factorization);
  fmpz_poly_set_fmpz(factor_product, factor_content);
  for (i = 0; i < factorization->num; i++) {
    fmpz_poly_pow(factor_power, factorization->p + i,
                  (ulong)factorization->exp[i]);
    fmpz_poly_mul(factor_tmp, factor_product, factor_power);
    fmpz_poly_set(factor_product, factor_tmp);
  }

  arb_const_pi(pi, 128);
  arb_sin(sin_pi, pi, 128);
  pi_str = arb_get_str(pi, 24, ARB_STR_NO_RADIUS);
  puts(pi_str);

  arb_set_ui(two, 2);
  arb_log(log_two, two, 128);
  arb_exp(exp_log_two, log_two, 128);

  acb_set_si_si(z, 1, 1);
  acb_mul(z_squared, z, z, 128);

  acb_poly_set_coeff_si(ball_poly, 0, 1);
  acb_poly_set_coeff_si(ball_poly, 1, 2);
  acb_poly_set_coeff_si(ball_poly, 2, 1);
  acb_set_si(eval_point, 3);
  acb_poly_evaluate(eval_value, ball_poly, eval_point, 128);

  ok = fmpz_cmp_ui(n, 0) > 0 && strcmp(poly_str, "3  1 2 1") == 0;
  ok = ok && strcmp(rational_str, "1/2") == 0;
  ok = ok && strcmp(bernoulli_str, "-691/2730") == 0;
  ok = ok && factorization->num == 2;
  ok = ok && fmpz_poly_equal(factor_product, factor_poly);
  ok = ok && arb_contains_zero(sin_pi);
  ok = ok && arb_contains_si(exp_log_two, 2);
  ok = ok && arb_contains_si(acb_realref(z_squared), 0);
  ok = ok && arb_contains_si(acb_imagref(z_squared), 2);
  ok = ok && arb_contains_si(acb_realref(eval_value), 16);
  ok = ok && arb_contains_zero(acb_imagref(eval_value));

  if (ok) {
    puts("flint-ok rational=1/2 bernoulli=-691/2730 factors=2 ball-poly=16");
  }

  flint_free(poly_str);
  flint_free(rational_str);
  flint_free(bernoulli_str);
  flint_free(pi_str);
  acb_poly_clear(ball_poly);
  acb_clear(eval_value);
  acb_clear(eval_point);
  acb_clear(z_squared);
  acb_clear(z);
  arb_clear(sin_pi);
  arb_clear(pi);
  arb_clear(exp_log_two);
  arb_clear(log_two);
  arb_clear(two);
  fmpz_poly_factor_clear(factorization);
  fmpz_poly_clear(factor_tmp);
  fmpz_poly_clear(factor_power);
  fmpz_poly_clear(factor_product);
  fmpz_poly_clear(factor_poly);
  fmpz_poly_clear(poly);
  fmpq_clear(rational_sum);
  fmpq_clear(bernoulli);
  fmpq_clear(b);
  fmpq_clear(a);
  fmpz_clear(factor_content);
  fmpz_clear(n);
  flint_cleanup();

  return ok ? 0 : 1;
}
