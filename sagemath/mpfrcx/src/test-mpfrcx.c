#include <mpfrcx.h>
#include <stdio.h>
#include <string.h>

static int check_mpfr(const char *label, mpfr_srcptr value,
                      const char *expected) {
  char actual[64];
  mpfr_snprintf(actual, sizeof(actual), "%.1RNf", value);
  if (strcmp(actual, expected) != 0) {
    fprintf(stderr, "unexpected %s: %s\n", label, actual);
    return 1;
  }
  return 0;
}

static int check_mpc(const char *label, mpc_srcptr value,
                     const char *expected_real,
                     const char *expected_imag) {
  char real[64];
  char imag[64];

  mpfr_snprintf(real, sizeof(real), "%.1RNf", mpc_realref(value));
  mpfr_snprintf(imag, sizeof(imag), "%.1RNf", mpc_imagref(value));

  if (strcmp(real, expected_real) != 0 || strcmp(imag, expected_imag) != 0) {
    fprintf(stderr, "unexpected %s: %s + %si\n", label, real, imag);
    return 1;
  }
  return 0;
}

static void set_mpfrx_coeff_si(mpfrx_t poly, unsigned int index, long value) {
  mpfr_t coeff;

  mpfr_init2(coeff, poly->prec);
  mpfr_set_si(coeff, value, MPFR_RNDN);
  mpfrx_set_coeff(poly, index, coeff);
  mpfr_clear(coeff);
}

static void set_mpfrx_from_si(mpfrx_t poly, const long *coeffs, int degree) {
  int i;

  for (i = 0; i <= degree; i++) {
    set_mpfrx_coeff_si(poly, (unsigned int)i, coeffs[i]);
  }
  mpfrx_set_deg(poly, degree);
}

static void set_mpcx_coeff_si(mpcx_t poly, unsigned int index, long real,
                              long imag) {
  mpc_t coeff;

  mpc_init2(coeff, poly->prec);
  mpc_set_si_si(coeff, real, imag, MPC_RNDNN);
  mpcx_set_coeff(poly, index, coeff);
  mpc_clear(coeff);
}

static void set_mpcx_from_si(mpcx_t poly, const long *real_coeffs,
                             const long *imag_coeffs, int degree) {
  int i;

  for (i = 0; i <= degree; i++) {
    set_mpcx_coeff_si(poly, (unsigned int)i, real_coeffs[i], imag_coeffs[i]);
  }
  mpcx_set_deg(poly, degree);
}

static int check_real_hecke(void) {
  const mpfr_prec_t prec = 128;
  const long factor0[] = {1, 0, 1};
  const long factor1[] = {-1, 1};
  const long factor2[] = {-2, 1};
  const long value0[] = {-2, 2};
  const long value1[] = {3};
  const long value2[] = {4};
  const long expected_coeffs[] = {-14, 17, -18, 9};
  const long product_coeffs[] = {2, -3, 3, -3, 1};
  mpfrx_t factors[3];
  mpfrx_t values[3];
  mpfrx_t interpolated;
  mpfrx_t expected;
  mpfrx_t product;
  mpfrx_t expected_product;
  mpfrx_tree_t subproducts;
  int failed = 0;
  int i;

  for (i = 0; i < 3; i++) {
    mpfrx_init(factors[i], 3, prec);
    mpfrx_init(values[i], 2, prec);
  }
  mpfrx_init(interpolated, 5, prec);
  mpfrx_init(expected, 4, prec);
  mpfrx_init(product, 5, prec);
  mpfrx_init(expected_product, 5, prec);
  mpfrx_tree_init(subproducts, 3, prec);

  set_mpfrx_from_si(factors[0], factor0, 2);
  set_mpfrx_from_si(factors[1], factor1, 1);
  set_mpfrx_from_si(factors[2], factor2, 1);
  set_mpfrx_from_si(values[0], value0, 1);
  set_mpfrx_from_si(values[1], value1, 0);
  set_mpfrx_from_si(values[2], value2, 0);
  set_mpfrx_from_si(expected, expected_coeffs, 3);
  set_mpfrx_from_si(expected_product, product_coeffs, 4);

  mpfrx_subproducttree(subproducts, factors);
  mpfrx_tree_get_root(product, subproducts);
  mpfrx_hecke(interpolated, subproducts, values);

  if (mpfrx_cmp(product, expected_product) != 0) {
    fprintf(stderr, "unexpected real subproduct tree root\n");
    failed = 1;
  }
  if (mpfrx_cmp(interpolated, expected) != 0) {
    fprintf(stderr, "unexpected real hecke interpolation\n");
    failed = 1;
  }

  mpfrx_tree_clear(subproducts);
  mpfrx_clear(expected_product);
  mpfrx_clear(product);
  mpfrx_clear(expected);
  mpfrx_clear(interpolated);
  for (i = 0; i < 3; i++) {
    mpfrx_clear(values[i]);
    mpfrx_clear(factors[i]);
  }
  return failed;
}

static int check_complex_hecke(void) {
  const mpfr_prec_t prec = 128;
  const long zero[] = {0, 0, 0, 0, 0};
  const long factor0[] = {1, 0, 1};
  const long factor1[] = {-1, 1};
  const long factor2[] = {-2, 1};
  const long value0[] = {-2, 2};
  const long value1[] = {3};
  const long value2[] = {4};
  const long expected_coeffs[] = {-14, 17, -18, 9};
  mpcx_t factors[3];
  mpcx_t values[3];
  mpcx_t interpolated;
  mpcx_t expected;
  mpcx_tree_t subproducts;
  int failed = 0;
  int i;

  for (i = 0; i < 3; i++) {
    mpcx_init(factors[i], 3, prec);
    mpcx_init(values[i], 2, prec);
  }
  mpcx_init(interpolated, 5, prec);
  mpcx_init(expected, 4, prec);
  mpcx_tree_init(subproducts, 3, prec);

  set_mpcx_from_si(factors[0], factor0, zero, 2);
  set_mpcx_from_si(factors[1], factor1, zero, 1);
  set_mpcx_from_si(factors[2], factor2, zero, 1);
  set_mpcx_from_si(values[0], value0, zero, 1);
  set_mpcx_from_si(values[1], value1, zero, 0);
  set_mpcx_from_si(values[2], value2, zero, 0);
  set_mpcx_from_si(expected, expected_coeffs, zero, 3);

  mpcx_subproducttree(subproducts, factors);
  mpcx_hecke(interpolated, subproducts, values);

  if (mpcx_cmp(interpolated, expected) != 0) {
    fprintf(stderr, "unexpected complex hecke interpolation\n");
    failed = 1;
  }

  mpcx_tree_clear(subproducts);
  mpcx_clear(expected);
  mpcx_clear(interpolated);
  for (i = 0; i < 3; i++) {
    mpcx_clear(values[i]);
    mpcx_clear(factors[i]);
  }
  return failed;
}

int main(void) {
  mpfr_t coeff;
  mpfr_t x;
  mpfr_t real_value;
  mpfr_t deriv_value;
  mpfr_t root_value;
  mpfr_t projection_value;
  mpfr_t roots[3];
  mpfr_t root_values[3];
  mpfrx_t f;
  mpfrx_t square;
  mpfrx_t derivative;
  mpfrx_t remainder;
  mpfrx_t real_part;
  mpfrx_t imag_part;
  mpfrx_t reconstructed;
  mpc_t ccoeff;
  mpc_t z;
  mpc_t complex_value;
  mpcx_t g;
  mpcx_t projected;
  int failed = 0;
  int i;

  mpfr_init2(coeff, 128);
  mpfr_init2(x, 128);
  mpfr_init2(real_value, 128);
  mpfr_init2(deriv_value, 128);
  mpfr_init2(root_value, 128);
  mpfr_init2(projection_value, 128);
  for (i = 0; i < 3; i++) {
    mpfr_init2(roots[i], 128);
    mpfr_init2(root_values[i], 128);
  }
  mpfrx_init(f, 3, 128);
  mpfrx_init(square, 5, 128);
  mpfrx_init(derivative, 4, 128);
  mpfrx_init(remainder, 2, 128);
  mpfrx_init(real_part, 3, 128);
  mpfrx_init(imag_part, 3, 128);
  mpfrx_init(reconstructed, 4, 128);

  mpfr_set_ui(coeff, 2, MPFR_RNDN);
  mpfrx_set_coeff(f, 0, coeff);
  mpfr_set_ui(coeff, 1, MPFR_RNDN);
  mpfrx_set_coeff(f, 1, coeff);
  mpfrx_set_deg(f, 1);

  mpfrx_mul(square, f, f);
  mpfrx_derive(derivative, square);
  mpfrx_rem(remainder, square, f);
  mpfrx_root(root_value, f);
  mpfr_set_ui(x, 3, MPFR_RNDN);
  mpfrx_eval(real_value, square, x);
  mpfrx_eval(deriv_value, derivative, x);

  failed |= check_mpfr("real-eval", real_value, "25.0");
  failed |= check_mpfr("real-derivative", deriv_value, "10.0");
  failed |= check_mpfr("linear-root", root_value, "-2.0");
  failed |= check_mpfr("division-remainder", mpfrx_get_coeff(remainder, 0),
                       "0.0");

  mpc_init2(ccoeff, 128);
  mpc_init2(z, 128);
  mpc_init2(complex_value, 128);
  mpcx_init(g, 3, 128);
  mpcx_init(projected, 2, 128);

  mpc_set_ui_ui(ccoeff, 1, 0, MPC_RNDNN);
  mpcx_set_coeff(g, 0, ccoeff);
  mpc_set_ui_ui(ccoeff, 0, 0, MPC_RNDNN);
  mpcx_set_coeff(g, 1, ccoeff);
  mpc_set_ui_ui(ccoeff, 1, 0, MPC_RNDNN);
  mpcx_set_coeff(g, 2, ccoeff);
  mpcx_set_deg(g, 2);
  mpc_set_ui_ui(z, 1, 1, MPC_RNDNN);
  mpcx_eval(complex_value, g, z);

  failed |= check_mpc("complex-eval", complex_value, "1.0", "2.0");

  mpc_set_si_si(ccoeff, 1, 1, MPC_RNDNN);
  mpcx_set_coeff(projected, 0, ccoeff);
  mpc_set_si_si(ccoeff, 2, -3, MPC_RNDNN);
  mpcx_set_coeff(projected, 1, ccoeff);
  mpcx_set_deg(projected, 1);
  mpfrcx_real(real_part, projected);
  mpfrcx_imag(imag_part, projected);
  mpfr_set_ui(x, 2, MPFR_RNDN);
  mpfrx_eval(projection_value, real_part, x);
  failed |= check_mpfr("projected-real", projection_value, "5.0");
  mpfrx_eval(projection_value, imag_part, x);
  failed |= check_mpfr("projected-imag", projection_value, "-5.0");

  mpfr_set_ui(roots[0], 1, MPFR_RNDN);
  mpfr_set_ui(roots[1], 2, MPFR_RNDN);
  mpfr_set_ui(roots[2], 3, MPFR_RNDN);
  mpfrx_reconstruct_from_roots(reconstructed, roots, 3);
  mpfrx_multieval(root_values, roots, 3, reconstructed);

  failed |= mpfrx_get_deg(reconstructed) != 3;
  failed |= check_mpfr("reconstructed-constant",
                       mpfrx_get_coeff(reconstructed, 0), "-6.0");
  failed |= check_mpfr("reconstructed-linear",
                       mpfrx_get_coeff(reconstructed, 1), "11.0");
  failed |= check_mpfr("reconstructed-quadratic",
                       mpfrx_get_coeff(reconstructed, 2), "-6.0");
  failed |= check_mpfr("reconstructed-cubic",
                       mpfrx_get_coeff(reconstructed, 3), "1.0");
  for (i = 0; i < 3; i++) {
    failed |= check_mpfr("root-evaluation", root_values[i], "0.0");
  }
  mpfr_set_ui(x, 4, MPFR_RNDN);
  mpfrx_eval(projection_value, reconstructed, x);
  failed |= check_mpfr("reconstructed-eval", projection_value, "6.0");
  failed |= check_real_hecke();
  failed |= check_complex_hecke();

  if (!failed)
    puts("mpfrcx-ok real-eval=25.0 real-derivative=10.0 "
         "root=-2.0 remainder=0.0 complex-eval=1.0+2.0i "
         "projection=5.0-5.0i reconstruct-roots=3 multieval=checked "
         "hecke=real,complex");

  mpfrx_clear(reconstructed);
  mpcx_clear(projected);
  mpcx_clear(g);
  mpc_clear(complex_value);
  mpc_clear(z);
  mpc_clear(ccoeff);
  mpfrx_clear(imag_part);
  mpfrx_clear(real_part);
  mpfrx_clear(remainder);
  mpfrx_clear(derivative);
  mpfrx_clear(square);
  mpfrx_clear(f);
  mpfr_clear(projection_value);
  mpfr_clear(root_value);
  mpfr_clear(deriv_value);
  mpfr_clear(real_value);
  mpfr_clear(x);
  mpfr_clear(coeff);
  for (i = 0; i < 3; i++) {
    mpfr_clear(root_values[i]);
    mpfr_clear(roots[i]);
  }
  return failed ? 1 : 0;
}
