#include <flint/flint.h>
#include <flint/acb.h>
#include <flint/acb_poly.h>
#include <flint/arb_fmpz_poly.h>
#include <flint/arb.h>
#include <flint/arb_hypgeom.h>
#include <flint/arb_poly.h>
#include <flint/arith.h>
#include <flint/bernoulli.h>
#include <flint/ca.h>
#include <flint/fmpq.h>
#include <flint/fmpz.h>
#include <flint/fmpz_factor.h>
#include <flint/fmpz_mat.h>
#include <flint/fmpz_mod.h>
#include <flint/fmpz_mod_poly.h>
#include <flint/fmpz_mod_poly_factor.h>
#include <flint/fmpz_poly.h>
#include <flint/fmpz_poly_factor.h>
#include <flint/fmpq_poly.h>
#include <flint/fmpq_mpoly.h>
#include <flint/fq_nmod.h>
#include <flint/nmod_mat.h>
#include <flint/nmod_mpoly.h>
#include <flint/nmod_poly.h>
#include <flint/nmod_poly_factor.h>
#include <flint/qqbar.h>
#include <flint/gr_types.h>

#include <stdio.h>
#include <string.h>

static int fmpq_equal_frac_si(const fmpq_t value, slong num, ulong den) {
  return fmpz_cmp_si(fmpq_numref(value), num) == 0 &&
         fmpz_cmp_ui(fmpq_denref(value), den) == 0;
}

static int acb_contains_si_si(const acb_t value, slong real, slong imag) {
  return arb_contains_si(acb_realref(value), real) &&
         arb_contains_si(acb_imagref(value), imag);
}

int main(void) {
  fmpz_t n;
  fmpz_t factor_content;
  fmpz_t integer_factor_input;
  fmpz_t integer_factor_reexpanded;
  fmpz_t integer_phi;
  fmpz_t integer_sigma;
  fmpz_t matrix_det;
  fmpz_t modular_base;
  fmpz_t modular_inverse;
  fmpz_t modular_modulus;
  fmpz_t modular_power;
  fmpz_t partition_count;
  fmpz_t poly_discriminant;
  fmpz_t poly_eval_value;
  fmpz_t poly_eval_x;
  fmpz_t poly_resultant;
  fmpz_t residue_a;
  fmpz_t residue_b;
  fmpz_t residue_combined;
  fmpz_t residue_mod_a;
  fmpz_t residue_mod_b;
  fmpz_t calcium_integer;
  fmpq_t a;
  fmpq_t b;
  fmpq_t bernoulli;
  fmpq_t q_mpoly_coeff;
  fmpq_t rational_sum;
  fmpz_mat_t matrix_a;
  fmpz_mat_t matrix_b;
  fmpz_mat_t matrix_product;
  fmpz_mat_t matrix_expected;
  fmpz_poly_t poly;
  fmpz_poly_t factor_poly;
  fmpz_poly_t factor_product;
  fmpz_poly_t factor_power;
  fmpz_poly_t factor_tmp;
  fmpz_poly_t gcd_poly_a;
  fmpz_poly_t gcd_poly_b;
  fmpz_poly_t gcd_poly_result;
  fmpz_poly_t gcd_poly_expected;
  fmpz_poly_t complex_roots_poly;
  fmpz_poly_t transform_poly_a;
  fmpz_poly_t transform_poly_b;
  fmpz_poly_t transform_poly_composed;
  fmpz_poly_t transform_poly_expected;
  fmpz_mod_ctx_t fmpz_mod_ctx;
  fmpz_mod_poly_t fmpz_mod_poly;
  fmpz_mod_poly_t fmpz_mod_factor_product;
  fmpz_mod_poly_t fmpz_mod_factor_power;
  fmpz_mod_poly_t fmpz_mod_factor_tmp;
  fmpz_poly_factor_t factorization;
  fmpz_factor_t integer_factorization;
  fmpz_mod_poly_factor_t fmpz_mod_factorization;
  fmpq_poly_t rational_poly;
  fmpq_poly_t rational_derivative;
  nmod_poly_t mod_poly;
  nmod_poly_t mod_factor_product;
  nmod_poly_t mod_factor_power;
  nmod_poly_t mod_factor_tmp;
  nmod_poly_factor_t mod_factorization;
  fq_nmod_ctx_t finite_field_ctx;
  fq_nmod_t finite_field_gen;
  fq_nmod_t finite_field_power;
  nmod_mpoly_ctx_t mpoly_ctx;
  nmod_mpoly_t mpoly_a;
  nmod_mpoly_t mpoly_b;
  nmod_mpoly_t mpoly_product;
  fmpq_mpoly_ctx_t q_mpoly_ctx;
  fmpq_mpoly_t q_mpoly_a;
  fmpq_mpoly_t q_mpoly_b;
  fmpq_mpoly_t q_mpoly_product;
  nmod_mat_t mod_matrix;
  nmod_mat_t mod_rhs;
  nmod_mat_t mod_solution;
  arb_t two;
  arb_t log_two;
  arb_t exp_log_two;
  arb_t pi;
  arb_t sin_pi;
  arb_t gamma_arg;
  arb_t gamma_value;
  arb_t erf_zero;
  arb_t bessel_order;
  arb_t bessel_arg;
  arb_t bessel_value;
  arb_t real_ball_value;
  arb_t real_ball_derivative_value;
  arb_t real_ball_integral_value;
  acb_t z;
  acb_t z_squared;
  acb_t eval_point;
  acb_t eval_value;
  arb_poly_t real_ball_poly;
  arb_poly_t real_ball_derivative;
  arb_poly_t real_ball_integral;
  acb_poly_t ball_poly;
  acb_ptr complex_roots;
  qqbar_t algebraic_sqrt2;
  qqbar_t algebraic_square;
  qqbar_t algebraic_i;
  qqbar_t algebraic_minus_one;
  qqbar_t algebraic_eval;
  ca_ctx_t calcium_ctx;
  ca_t calcium_two;
  ca_t calcium_sqrt2;
  ca_t calcium_square;
  ca_t calcium_expected;
  char *bernoulli_str;
  char *poly_str;
  char *rational_str;
  char *pi_str;
  int ok;
  int mod_solved;
  slong matrix_rank;
  slong mod_matrix_rank;
  slong root_of_unity_p;
  ulong mod_det;
  ulong root_of_unity_q;
  ulong exp_xy[2];
  slong i;

  fmpz_init(n);
  fmpz_init(factor_content);
  fmpz_init(integer_factor_input);
  fmpz_init(integer_factor_reexpanded);
  fmpz_init(integer_phi);
  fmpz_init(integer_sigma);
  fmpz_init(matrix_det);
  fmpz_init(modular_base);
  fmpz_init(modular_inverse);
  fmpz_init(modular_modulus);
  fmpz_init(modular_power);
  fmpz_init(partition_count);
  fmpz_init(poly_discriminant);
  fmpz_init(poly_eval_value);
  fmpz_init(poly_eval_x);
  fmpz_init(poly_resultant);
  fmpz_init(residue_a);
  fmpz_init(residue_b);
  fmpz_init(residue_combined);
  fmpz_init(residue_mod_a);
  fmpz_init(residue_mod_b);
  fmpz_init(calcium_integer);
  fmpq_init(a);
  fmpq_init(b);
  fmpq_init(bernoulli);
  fmpq_init(q_mpoly_coeff);
  fmpq_init(rational_sum);
  fmpz_mat_init(matrix_a, 3, 3);
  fmpz_mat_init(matrix_b, 3, 3);
  fmpz_mat_init(matrix_product, 3, 3);
  fmpz_mat_init(matrix_expected, 3, 3);
  fmpz_poly_init(poly);
  fmpz_poly_init(factor_poly);
  fmpz_poly_init(factor_product);
  fmpz_poly_init(factor_power);
  fmpz_poly_init(factor_tmp);
  fmpz_poly_init(gcd_poly_a);
  fmpz_poly_init(gcd_poly_b);
  fmpz_poly_init(gcd_poly_result);
  fmpz_poly_init(gcd_poly_expected);
  fmpz_poly_init(complex_roots_poly);
  fmpz_poly_init(transform_poly_a);
  fmpz_poly_init(transform_poly_b);
  fmpz_poly_init(transform_poly_composed);
  fmpz_poly_init(transform_poly_expected);
  fmpz_mod_ctx_init_ui(fmpz_mod_ctx, 17);
  fmpz_mod_poly_init(fmpz_mod_poly, fmpz_mod_ctx);
  fmpz_mod_poly_init(fmpz_mod_factor_product, fmpz_mod_ctx);
  fmpz_mod_poly_init(fmpz_mod_factor_power, fmpz_mod_ctx);
  fmpz_mod_poly_init(fmpz_mod_factor_tmp, fmpz_mod_ctx);
  fmpz_poly_factor_init(factorization);
  fmpz_factor_init(integer_factorization);
  fmpz_mod_poly_factor_init(fmpz_mod_factorization, fmpz_mod_ctx);
  fmpq_poly_init(rational_poly);
  fmpq_poly_init(rational_derivative);
  nmod_poly_init(mod_poly, 5);
  nmod_poly_init(mod_factor_product, 5);
  nmod_poly_init(mod_factor_power, 5);
  nmod_poly_init(mod_factor_tmp, 5);
  nmod_poly_factor_init(mod_factorization);
  fq_nmod_ctx_init_ui(finite_field_ctx, 3, 2, "t");
  fq_nmod_init(finite_field_gen, finite_field_ctx);
  fq_nmod_init(finite_field_power, finite_field_ctx);
  nmod_mpoly_ctx_init(mpoly_ctx, 2, ORD_LEX, 7);
  nmod_mpoly_init(mpoly_a, mpoly_ctx);
  nmod_mpoly_init(mpoly_b, mpoly_ctx);
  nmod_mpoly_init(mpoly_product, mpoly_ctx);
  fmpq_mpoly_ctx_init(q_mpoly_ctx, 2, ORD_LEX);
  fmpq_mpoly_init(q_mpoly_a, q_mpoly_ctx);
  fmpq_mpoly_init(q_mpoly_b, q_mpoly_ctx);
  fmpq_mpoly_init(q_mpoly_product, q_mpoly_ctx);
  nmod_mat_init(mod_matrix, 3, 3, 17);
  nmod_mat_init(mod_rhs, 3, 1, 17);
  nmod_mat_init(mod_solution, 3, 1, 17);
  arb_init(two);
  arb_init(log_two);
  arb_init(exp_log_two);
  arb_init(pi);
  arb_init(sin_pi);
  arb_init(gamma_arg);
  arb_init(gamma_value);
  arb_init(erf_zero);
  arb_init(bessel_order);
  arb_init(bessel_arg);
  arb_init(bessel_value);
  arb_init(real_ball_value);
  arb_init(real_ball_derivative_value);
  arb_init(real_ball_integral_value);
  acb_init(z);
  acb_init(z_squared);
  acb_init(eval_point);
  acb_init(eval_value);
  arb_poly_init(real_ball_poly);
  arb_poly_init(real_ball_derivative);
  arb_poly_init(real_ball_integral);
  acb_poly_init(ball_poly);
  complex_roots = _acb_vec_init(2);
  qqbar_init(algebraic_sqrt2);
  qqbar_init(algebraic_square);
  qqbar_init(algebraic_i);
  qqbar_init(algebraic_minus_one);
  qqbar_init(algebraic_eval);
  ca_ctx_init(calcium_ctx);
  ca_init(calcium_two, calcium_ctx);
  ca_init(calcium_sqrt2, calcium_ctx);
  ca_init(calcium_square, calcium_ctx);
  ca_init(calcium_expected, calcium_ctx);

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

  nmod_poly_set_coeff_ui(mod_poly, 0, 1);
  nmod_poly_set_coeff_ui(mod_poly, 2, 1);
  nmod_poly_factor(mod_factorization, mod_poly);
  nmod_poly_set_coeff_ui(mod_factor_product, 0, 1);
  for (i = 0; i < mod_factorization->num; i++) {
    nmod_poly_pow(mod_factor_power, mod_factorization->p + i,
                  (ulong)mod_factorization->exp[i]);
    nmod_poly_mul(mod_factor_tmp, mod_factor_product, mod_factor_power);
    nmod_poly_set(mod_factor_product, mod_factor_tmp);
  }

  arb_const_pi(pi, 128);
  arb_sin(sin_pi, pi, 128);
  pi_str = arb_get_str(pi, 24, ARB_STR_NO_RADIUS);
  puts(pi_str);

  arb_set_ui(two, 2);
  arb_log(log_two, two, 128);
  arb_exp(exp_log_two, log_two, 128);
  arb_set_ui(gamma_arg, 5);
  arb_hypgeom_gamma(gamma_value, gamma_arg, 128);
  arb_zero(erf_zero);
  arb_hypgeom_erf(erf_zero, erf_zero, 128);
  arb_zero(bessel_order);
  arb_zero(bessel_arg);
  arb_hypgeom_bessel_j(bessel_value, bessel_order, bessel_arg, 128);

  acb_set_si_si(z, 1, 1);
  acb_mul(z_squared, z, z, 128);

  acb_poly_set_coeff_si(ball_poly, 0, 1);
  acb_poly_set_coeff_si(ball_poly, 1, 2);
  acb_poly_set_coeff_si(ball_poly, 2, 1);
  acb_set_si(eval_point, 3);
  acb_poly_evaluate(eval_value, ball_poly, eval_point, 128);

  arb_poly_set_coeff_si(real_ball_poly, 0, 1);
  arb_poly_set_coeff_si(real_ball_poly, 1, 2);
  arb_poly_set_coeff_si(real_ball_poly, 2, 3);
  arb_poly_evaluate(real_ball_value, real_ball_poly, two, 128);
  arb_poly_derivative(real_ball_derivative, real_ball_poly, 128);
  arb_poly_evaluate(real_ball_derivative_value, real_ball_derivative, two, 128);
  arb_poly_integral(real_ball_integral, real_ball_poly, 128);
  arb_poly_evaluate(real_ball_integral_value, real_ball_integral, two, 128);

  ok = fmpz_cmp_ui(n, 0) > 0 && strcmp(poly_str, "3  1 2 1") == 0;
  ok = ok && strcmp(rational_str, "1/2") == 0;
  ok = ok && strcmp(bernoulli_str, "-691/2730") == 0;
  ok = ok && factorization->num == 2;
  ok = ok && fmpz_poly_equal(factor_product, factor_poly);
  ok = ok && mod_factorization->num == 2;
  ok = ok && nmod_poly_equal(mod_factor_product, mod_poly);

  fmpz_set_ui(integer_factor_input, 360);
  fmpz_factor(integer_factorization, integer_factor_input);
  fmpz_factor_expand(integer_factor_reexpanded, integer_factorization);
  fmpz_factor_euler_phi(integer_phi, integer_factorization);
  fmpz_factor_divisor_sigma(integer_sigma, 1, integer_factorization);
  ok = ok && integer_factorization->num == 3;
  ok = ok && fmpz_equal_ui(integer_factorization->p + 0, 2);
  ok = ok && integer_factorization->exp[0] == 3;
  ok = ok && fmpz_equal_ui(integer_factorization->p + 1, 3);
  ok = ok && integer_factorization->exp[1] == 2;
  ok = ok && fmpz_equal_ui(integer_factorization->p + 2, 5);
  ok = ok && integer_factorization->exp[2] == 1;
  ok = ok && fmpz_equal(integer_factor_reexpanded, integer_factor_input);
  ok = ok && fmpz_equal_ui(integer_phi, 96);
  ok = ok && fmpz_equal_ui(integer_sigma, 1170);
  ok = ok && fmpz_factor_moebius_mu(integer_factorization) == 0;

  arith_number_of_partitions(partition_count, 10);
  fmpz_set_ui(residue_a, 2);
  fmpz_set_ui(residue_mod_a, 3);
  fmpz_set_ui(residue_b, 3);
  fmpz_set_ui(residue_mod_b, 5);
  fmpz_CRT(residue_combined, residue_a, residue_mod_a, residue_b,
           residue_mod_b, 0);
  fmpz_set_ui(modular_base, 7);
  fmpz_set_ui(modular_modulus, 40);
  fmpz_powm_ui(modular_power, modular_base, 4, modular_modulus);
  ok = ok && fmpz_equal_ui(partition_count, 42);
  ok = ok && fmpz_equal_ui(residue_combined, 8);
  ok = ok && fmpz_invmod(modular_inverse, modular_base, modular_modulus);
  ok = ok && fmpz_equal_ui(modular_inverse, 23);
  ok = ok && fmpz_equal_ui(modular_power, 1);
  ok = ok && fmpz_jacobi(modular_base, residue_mod_b) == -1;

  fmpz_mod_poly_set_coeff_si(fmpz_mod_poly, 0, -1, fmpz_mod_ctx);
  fmpz_mod_poly_set_coeff_ui(fmpz_mod_poly, 2, 1, fmpz_mod_ctx);
  fmpz_mod_poly_factor(fmpz_mod_factorization, fmpz_mod_poly, fmpz_mod_ctx);
  fmpz_mod_poly_set_coeff_ui(fmpz_mod_factor_product, 0, 1, fmpz_mod_ctx);
  for (i = 0; i < fmpz_mod_factorization->num; i++) {
    fmpz_mod_poly_pow(fmpz_mod_factor_power, fmpz_mod_factorization->poly + i,
                      (ulong)fmpz_mod_factorization->exp[i], fmpz_mod_ctx);
    fmpz_mod_poly_mul(fmpz_mod_factor_tmp, fmpz_mod_factor_product,
                      fmpz_mod_factor_power, fmpz_mod_ctx);
    fmpz_mod_poly_set(fmpz_mod_factor_product, fmpz_mod_factor_tmp,
                      fmpz_mod_ctx);
  }
  ok = ok && fmpz_mod_factorization->num == 2;
  ok = ok && fmpz_mod_poly_equal(fmpz_mod_factor_product, fmpz_mod_poly,
                                 fmpz_mod_ctx);

  fmpz_poly_set_coeff_si(gcd_poly_a, 0, -2);
  fmpz_poly_set_coeff_si(gcd_poly_a, 1, 1);
  fmpz_poly_set_coeff_si(gcd_poly_a, 2, -2);
  fmpz_poly_set_coeff_si(gcd_poly_a, 3, 1);
  fmpz_poly_set_coeff_si(gcd_poly_b, 0, -10);
  fmpz_poly_set_coeff_si(gcd_poly_b, 1, 3);
  fmpz_poly_set_coeff_si(gcd_poly_b, 2, 1);
  fmpz_poly_set_coeff_si(gcd_poly_expected, 0, -2);
  fmpz_poly_set_coeff_si(gcd_poly_expected, 1, 1);
  fmpz_poly_gcd(gcd_poly_result, gcd_poly_a, gcd_poly_b);
  ok = ok && fmpz_poly_equal(gcd_poly_result, gcd_poly_expected);

  fmpz_poly_set_coeff_si(transform_poly_a, 0, -2);
  fmpz_poly_set_coeff_ui(transform_poly_a, 2, 1);
  fmpz_poly_set_coeff_si(transform_poly_b, 0, -1);
  fmpz_poly_set_coeff_ui(transform_poly_b, 1, 1);
  fmpz_poly_resultant(poly_resultant, transform_poly_a, transform_poly_b);
  fmpz_poly_discriminant(poly_discriminant, transform_poly_a);
  fmpz_set_ui(poly_eval_x, 5);
  fmpz_poly_evaluate_fmpz(poly_eval_value, transform_poly_a, poly_eval_x);

  fmpz_poly_set_coeff_ui(transform_poly_b, 0, 1);
  fmpz_poly_compose(transform_poly_composed, transform_poly_a,
                    transform_poly_b);
  fmpz_poly_set_coeff_si(transform_poly_expected, 0, -1);
  fmpz_poly_set_coeff_ui(transform_poly_expected, 1, 2);
  fmpz_poly_set_coeff_ui(transform_poly_expected, 2, 1);
  ok = ok && fmpz_equal_si(poly_resultant, -1);
  ok = ok && fmpz_equal_ui(poly_discriminant, 8);
  ok = ok && fmpz_equal_ui(poly_eval_value, 23);
  ok = ok && fmpz_poly_equal(transform_poly_composed, transform_poly_expected);

  fmpq_set_si(q_mpoly_coeff, 1, 2);
  fmpq_poly_set_coeff_fmpq(rational_poly, 0, q_mpoly_coeff);
  fmpq_poly_set_coeff_si(rational_poly, 1, -3);
  fmpq_set_si(q_mpoly_coeff, 5, 6);
  fmpq_poly_set_coeff_fmpq(rational_poly, 3, q_mpoly_coeff);
  fmpq_poly_derivative(rational_derivative, rational_poly);
  fmpq_poly_get_coeff_fmpq(q_mpoly_coeff, rational_derivative, 0);
  ok = ok && fmpq_equal_frac_si(q_mpoly_coeff, -3, 1);
  fmpq_poly_get_coeff_fmpq(q_mpoly_coeff, rational_derivative, 1);
  ok = ok && fmpq_is_zero(q_mpoly_coeff);
  fmpq_poly_get_coeff_fmpq(q_mpoly_coeff, rational_derivative, 2);
  ok = ok && fmpq_equal_frac_si(q_mpoly_coeff, 5, 2);

  fq_nmod_gen(finite_field_gen, finite_field_ctx);
  fq_nmod_pow_ui(finite_field_power, finite_field_gen, 8, finite_field_ctx);
  ok = ok && fq_nmod_is_one(finite_field_power, finite_field_ctx);

  exp_xy[0] = 2;
  exp_xy[1] = 1;
  nmod_mpoly_set_coeff_ui_ui(mpoly_a, 2, exp_xy, mpoly_ctx);
  exp_xy[0] = 0;
  exp_xy[1] = 1;
  nmod_mpoly_set_coeff_ui_ui(mpoly_a, 3, exp_xy, mpoly_ctx);
  exp_xy[0] = 1;
  exp_xy[1] = 0;
  nmod_mpoly_set_coeff_ui_ui(mpoly_b, 1, exp_xy, mpoly_ctx);
  exp_xy[0] = 0;
  exp_xy[1] = 0;
  nmod_mpoly_set_coeff_ui_ui(mpoly_b, 4, exp_xy, mpoly_ctx);
  nmod_mpoly_mul(mpoly_product, mpoly_a, mpoly_b, mpoly_ctx);
  exp_xy[0] = 3;
  exp_xy[1] = 1;
  ok = ok && nmod_mpoly_get_coeff_ui_ui(mpoly_product, exp_xy, mpoly_ctx) == 2;
  exp_xy[0] = 2;
  exp_xy[1] = 1;
  ok = ok && nmod_mpoly_get_coeff_ui_ui(mpoly_product, exp_xy, mpoly_ctx) == 1;
  exp_xy[0] = 1;
  exp_xy[1] = 1;
  ok = ok && nmod_mpoly_get_coeff_ui_ui(mpoly_product, exp_xy, mpoly_ctx) == 3;
  exp_xy[0] = 0;
  exp_xy[1] = 1;
  ok = ok && nmod_mpoly_get_coeff_ui_ui(mpoly_product, exp_xy, mpoly_ctx) == 5;

  fmpq_set_si(q_mpoly_coeff, 1, 2);
  exp_xy[0] = 2;
  exp_xy[1] = 1;
  fmpq_mpoly_set_coeff_fmpq_ui(q_mpoly_a, q_mpoly_coeff, exp_xy,
                               q_mpoly_ctx);
  fmpq_set_si(q_mpoly_coeff, 2, 3);
  exp_xy[0] = 0;
  exp_xy[1] = 1;
  fmpq_mpoly_set_coeff_fmpq_ui(q_mpoly_a, q_mpoly_coeff, exp_xy,
                               q_mpoly_ctx);
  fmpq_set_si(q_mpoly_coeff, 3, 5);
  exp_xy[0] = 1;
  exp_xy[1] = 0;
  fmpq_mpoly_set_coeff_fmpq_ui(q_mpoly_b, q_mpoly_coeff, exp_xy,
                               q_mpoly_ctx);
  fmpq_set_si(q_mpoly_coeff, 5, 1);
  exp_xy[0] = 0;
  exp_xy[1] = 0;
  fmpq_mpoly_set_coeff_fmpq_ui(q_mpoly_b, q_mpoly_coeff, exp_xy,
                               q_mpoly_ctx);
  fmpq_mpoly_mul(q_mpoly_product, q_mpoly_a, q_mpoly_b, q_mpoly_ctx);

  exp_xy[0] = 3;
  exp_xy[1] = 1;
  fmpq_mpoly_get_coeff_fmpq_ui(q_mpoly_coeff, q_mpoly_product, exp_xy,
                               q_mpoly_ctx);
  ok = ok && fmpq_equal_frac_si(q_mpoly_coeff, 3, 10);
  exp_xy[0] = 2;
  exp_xy[1] = 1;
  fmpq_mpoly_get_coeff_fmpq_ui(q_mpoly_coeff, q_mpoly_product, exp_xy,
                               q_mpoly_ctx);
  ok = ok && fmpq_equal_frac_si(q_mpoly_coeff, 5, 2);
  exp_xy[0] = 1;
  exp_xy[1] = 1;
  fmpq_mpoly_get_coeff_fmpq_ui(q_mpoly_coeff, q_mpoly_product, exp_xy,
                               q_mpoly_ctx);
  ok = ok && fmpq_equal_frac_si(q_mpoly_coeff, 2, 5);
  exp_xy[0] = 0;
  exp_xy[1] = 1;
  fmpq_mpoly_get_coeff_fmpq_ui(q_mpoly_coeff, q_mpoly_product, exp_xy,
                               q_mpoly_ctx);
  ok = ok && fmpq_equal_frac_si(q_mpoly_coeff, 10, 3);

  ok = ok && arb_contains_zero(sin_pi);
  ok = ok && arb_contains_si(exp_log_two, 2);
  ok = ok && arb_contains_si(gamma_value, 24);
  ok = ok && arb_contains_zero(erf_zero);
  ok = ok && arb_contains_si(bessel_value, 1);
  ok = ok && arb_contains_si(acb_realref(z_squared), 0);
  ok = ok && arb_contains_si(acb_imagref(z_squared), 2);
  ok = ok && arb_contains_si(acb_realref(eval_value), 16);
  ok = ok && arb_contains_zero(acb_imagref(eval_value));
  ok = ok && arb_contains_si(real_ball_value, 17);
  ok = ok && arb_contains_si(real_ball_derivative_value, 14);
  ok = ok && arb_contains_si(real_ball_integral_value, 14);

  fmpz_poly_set_coeff_ui(complex_roots_poly, 0, 1);
  fmpz_poly_set_coeff_ui(complex_roots_poly, 2, 1);
  arb_fmpz_poly_complex_roots(complex_roots, complex_roots_poly, 0, 64);
  ok = ok &&
       ((acb_contains_si_si(complex_roots + 0, 0, 1) &&
         acb_contains_si_si(complex_roots + 1, 0, -1)) ||
        (acb_contains_si_si(complex_roots + 0, 0, -1) &&
         acb_contains_si_si(complex_roots + 1, 0, 1)));

  qqbar_sqrt_ui(algebraic_sqrt2, 2);
  qqbar_sqr(algebraic_square, algebraic_sqrt2);
  qqbar_set_ui(algebraic_eval, 2);
  ok = ok && qqbar_equal(algebraic_square, algebraic_eval);

  qqbar_i(algebraic_i);
  qqbar_sqr(algebraic_minus_one, algebraic_i);
  ok = ok && qqbar_is_neg_one(algebraic_minus_one);
  ok = ok && qqbar_is_root_of_unity(&root_of_unity_p, &root_of_unity_q,
                                    algebraic_i);
  ok = ok && root_of_unity_p == 1 && root_of_unity_q == 4;

  fmpz_poly_zero(poly);
  fmpz_poly_set_coeff_si(poly, 0, -2);
  fmpz_poly_set_coeff_ui(poly, 2, 1);
  qqbar_evaluate_fmpz_poly(algebraic_eval, poly, algebraic_sqrt2);
  ok = ok && qqbar_is_zero(algebraic_eval);

  ca_set_ui(calcium_two, 2, calcium_ctx);
  ca_sqrt(calcium_sqrt2, calcium_two, calcium_ctx);
  ca_mul(calcium_square, calcium_sqrt2, calcium_sqrt2, calcium_ctx);
  ca_set_ui(calcium_expected, 2, calcium_ctx);
  ok = ok && ca_check_equal(calcium_square, calcium_expected, calcium_ctx) ==
                 T_TRUE;
  ok = ok && ca_get_fmpz(calcium_integer, calcium_expected, calcium_ctx);
  ok = ok && fmpz_equal_ui(calcium_integer, 2);

  fmpz_set_si(fmpz_mat_entry(matrix_a, 0, 0), 1);
  fmpz_set_si(fmpz_mat_entry(matrix_a, 0, 1), 2);
  fmpz_set_si(fmpz_mat_entry(matrix_a, 0, 2), 3);
  fmpz_set_si(fmpz_mat_entry(matrix_a, 1, 1), 4);
  fmpz_set_si(fmpz_mat_entry(matrix_a, 1, 2), 5);
  fmpz_set_si(fmpz_mat_entry(matrix_a, 2, 0), 1);
  fmpz_set_si(fmpz_mat_entry(matrix_a, 2, 2), 6);

  fmpz_set_si(fmpz_mat_entry(matrix_b, 0, 0), 2);
  fmpz_set_si(fmpz_mat_entry(matrix_b, 0, 1), -1);
  fmpz_set_si(fmpz_mat_entry(matrix_b, 1, 1), 3);
  fmpz_set_si(fmpz_mat_entry(matrix_b, 1, 2), 1);
  fmpz_set_si(fmpz_mat_entry(matrix_b, 2, 0), 4);
  fmpz_set_si(fmpz_mat_entry(matrix_b, 2, 2), -2);

  fmpz_mat_mul(matrix_product, matrix_a, matrix_b);
  fmpz_set_si(fmpz_mat_entry(matrix_expected, 0, 0), 14);
  fmpz_set_si(fmpz_mat_entry(matrix_expected, 0, 1), 5);
  fmpz_set_si(fmpz_mat_entry(matrix_expected, 0, 2), -4);
  fmpz_set_si(fmpz_mat_entry(matrix_expected, 1, 0), 20);
  fmpz_set_si(fmpz_mat_entry(matrix_expected, 1, 1), 12);
  fmpz_set_si(fmpz_mat_entry(matrix_expected, 1, 2), -6);
  fmpz_set_si(fmpz_mat_entry(matrix_expected, 2, 0), 26);
  fmpz_set_si(fmpz_mat_entry(matrix_expected, 2, 1), -1);
  fmpz_set_si(fmpz_mat_entry(matrix_expected, 2, 2), -12);
  fmpz_mat_det(matrix_det, matrix_a);
  matrix_rank = fmpz_mat_rank(matrix_a);

  nmod_mat_set_entry(mod_matrix, 0, 0, 1);
  nmod_mat_set_entry(mod_matrix, 0, 1, 2);
  nmod_mat_set_entry(mod_matrix, 0, 2, 3);
  nmod_mat_set_entry(mod_matrix, 1, 1, 4);
  nmod_mat_set_entry(mod_matrix, 1, 2, 5);
  nmod_mat_set_entry(mod_matrix, 2, 0, 1);
  nmod_mat_set_entry(mod_matrix, 2, 2, 6);
  nmod_mat_set_entry(mod_rhs, 0, 0, 14);
  nmod_mat_set_entry(mod_rhs, 1, 0, 6);
  nmod_mat_set_entry(mod_rhs, 2, 0, 2);
  mod_det = nmod_mat_det(mod_matrix);
  mod_matrix_rank = nmod_mat_rank(mod_matrix);
  mod_solved = nmod_mat_solve(mod_solution, mod_matrix, mod_rhs);

  ok = ok && fmpz_mat_equal(matrix_product, matrix_expected);
  ok = ok && fmpz_equal_si(matrix_det, 22);
  ok = ok && matrix_rank == 3;
  ok = ok && mod_det == 5;
  ok = ok && mod_matrix_rank == 3;
  ok = ok && mod_solved;
  ok = ok && nmod_mat_get_entry(mod_solution, 0, 0) == 1;
  ok = ok && nmod_mat_get_entry(mod_solution, 1, 0) == 2;
  ok = ok && nmod_mat_get_entry(mod_solution, 2, 0) == 3;

  if (ok) {
    puts("flint-ok rational=1/2 bernoulli=-691/2730 factors=2 integer-factor=360 arith=partitions,crt,powmod poly-gcd=x-2 poly-transform=resultant,discriminant,compose finite-field-factors=2 fmpz-mod-factors=2 fq=gf9 mpoly=zmod7 q-poly-derivative=5/2x^2-3 q-mpoly=Qxy matrix-det=22 mod-solve=1,2,3 arb-hypgeom=gamma,erf,bessel arb-poly=value,derivative,integral ball-poly=16 roots=+i,-i qqbar=sqrt2,i calcium=sqrt2");
  }

  flint_free(poly_str);
  flint_free(rational_str);
  flint_free(bernoulli_str);
  flint_free(pi_str);
  ca_clear(calcium_expected, calcium_ctx);
  ca_clear(calcium_square, calcium_ctx);
  ca_clear(calcium_sqrt2, calcium_ctx);
  ca_clear(calcium_two, calcium_ctx);
  ca_ctx_clear(calcium_ctx);
  qqbar_clear(algebraic_eval);
  qqbar_clear(algebraic_minus_one);
  qqbar_clear(algebraic_i);
  qqbar_clear(algebraic_square);
  qqbar_clear(algebraic_sqrt2);
  _acb_vec_clear(complex_roots, 2);
  acb_poly_clear(ball_poly);
  arb_poly_clear(real_ball_integral);
  arb_poly_clear(real_ball_derivative);
  arb_poly_clear(real_ball_poly);
  acb_clear(eval_value);
  acb_clear(eval_point);
  acb_clear(z_squared);
  acb_clear(z);
  arb_clear(real_ball_integral_value);
  arb_clear(real_ball_derivative_value);
  arb_clear(real_ball_value);
  arb_clear(sin_pi);
  arb_clear(pi);
  arb_clear(bessel_value);
  arb_clear(bessel_arg);
  arb_clear(bessel_order);
  arb_clear(erf_zero);
  arb_clear(gamma_value);
  arb_clear(gamma_arg);
  arb_clear(exp_log_two);
  arb_clear(log_two);
  arb_clear(two);
  nmod_mat_clear(mod_solution);
  nmod_mat_clear(mod_rhs);
  nmod_mat_clear(mod_matrix);
  nmod_mpoly_clear(mpoly_product, mpoly_ctx);
  nmod_mpoly_clear(mpoly_b, mpoly_ctx);
  nmod_mpoly_clear(mpoly_a, mpoly_ctx);
  nmod_mpoly_ctx_clear(mpoly_ctx);
  fmpq_mpoly_clear(q_mpoly_product, q_mpoly_ctx);
  fmpq_mpoly_clear(q_mpoly_b, q_mpoly_ctx);
  fmpq_mpoly_clear(q_mpoly_a, q_mpoly_ctx);
  fmpq_mpoly_ctx_clear(q_mpoly_ctx);
  fq_nmod_clear(finite_field_power, finite_field_ctx);
  fq_nmod_clear(finite_field_gen, finite_field_ctx);
  fq_nmod_ctx_clear(finite_field_ctx);
  nmod_poly_factor_clear(mod_factorization);
  fmpz_mod_poly_factor_clear(fmpz_mod_factorization, fmpz_mod_ctx);
  nmod_poly_clear(mod_factor_tmp);
  nmod_poly_clear(mod_factor_power);
  nmod_poly_clear(mod_factor_product);
  nmod_poly_clear(mod_poly);
  fmpq_poly_clear(rational_derivative);
  fmpq_poly_clear(rational_poly);
  fmpz_factor_clear(integer_factorization);
  fmpz_poly_factor_clear(factorization);
  fmpz_poly_clear(gcd_poly_expected);
  fmpz_poly_clear(gcd_poly_result);
  fmpz_poly_clear(gcd_poly_b);
  fmpz_poly_clear(gcd_poly_a);
  fmpz_poly_clear(transform_poly_expected);
  fmpz_poly_clear(transform_poly_composed);
  fmpz_poly_clear(transform_poly_b);
  fmpz_poly_clear(transform_poly_a);
  fmpz_mod_poly_clear(fmpz_mod_factor_tmp, fmpz_mod_ctx);
  fmpz_mod_poly_clear(fmpz_mod_factor_power, fmpz_mod_ctx);
  fmpz_mod_poly_clear(fmpz_mod_factor_product, fmpz_mod_ctx);
  fmpz_mod_poly_clear(fmpz_mod_poly, fmpz_mod_ctx);
  fmpz_mod_ctx_clear(fmpz_mod_ctx);
  fmpz_poly_clear(factor_tmp);
  fmpz_poly_clear(factor_power);
  fmpz_poly_clear(factor_product);
  fmpz_poly_clear(factor_poly);
  fmpz_poly_clear(complex_roots_poly);
  fmpz_poly_clear(poly);
  fmpz_mat_clear(matrix_expected);
  fmpz_mat_clear(matrix_product);
  fmpz_mat_clear(matrix_b);
  fmpz_mat_clear(matrix_a);
  fmpq_clear(rational_sum);
  fmpq_clear(q_mpoly_coeff);
  fmpq_clear(bernoulli);
  fmpq_clear(b);
  fmpq_clear(a);
  fmpz_clear(poly_resultant);
  fmpz_clear(residue_mod_b);
  fmpz_clear(residue_mod_a);
  fmpz_clear(residue_combined);
  fmpz_clear(residue_b);
  fmpz_clear(residue_a);
  fmpz_clear(calcium_integer);
  fmpz_clear(poly_eval_x);
  fmpz_clear(poly_eval_value);
  fmpz_clear(poly_discriminant);
  fmpz_clear(partition_count);
  fmpz_clear(modular_power);
  fmpz_clear(modular_modulus);
  fmpz_clear(modular_inverse);
  fmpz_clear(modular_base);
  fmpz_clear(matrix_det);
  fmpz_clear(integer_sigma);
  fmpz_clear(integer_phi);
  fmpz_clear(integer_factor_reexpanded);
  fmpz_clear(integer_factor_input);
  fmpz_clear(factor_content);
  fmpz_clear(n);
  flint_cleanup();

  return ok ? 0 : 1;
}
