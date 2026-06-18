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

  if (!failed)
    puts("mpfrcx-ok real-eval=25.0 real-derivative=10.0 "
         "root=-2.0 remainder=0.0 complex-eval=1.0+2.0i "
         "projection=5.0-5.0i reconstruct-roots=3 multieval=checked");

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
