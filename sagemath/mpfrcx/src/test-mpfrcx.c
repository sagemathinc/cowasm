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
  mpfrx_t f;
  mpfrx_t square;
  mpfrx_t derivative;
  mpc_t ccoeff;
  mpc_t z;
  mpc_t complex_value;
  mpcx_t g;
  int failed = 0;

  mpfr_init2(coeff, 128);
  mpfr_init2(x, 128);
  mpfr_init2(real_value, 128);
  mpfr_init2(deriv_value, 128);
  mpfrx_init(f, 3, 128);
  mpfrx_init(square, 5, 128);
  mpfrx_init(derivative, 4, 128);

  mpfr_set_ui(coeff, 2, MPFR_RNDN);
  mpfrx_set_coeff(f, 0, coeff);
  mpfr_set_ui(coeff, 1, MPFR_RNDN);
  mpfrx_set_coeff(f, 1, coeff);
  mpfrx_set_deg(f, 1);

  mpfrx_mul(square, f, f);
  mpfrx_derive(derivative, square);
  mpfr_set_ui(x, 3, MPFR_RNDN);
  mpfrx_eval(real_value, square, x);
  mpfrx_eval(deriv_value, derivative, x);

  failed |= check_mpfr("real-eval", real_value, "25.0");
  failed |= check_mpfr("real-derivative", deriv_value, "10.0");

  mpc_init2(ccoeff, 128);
  mpc_init2(z, 128);
  mpc_init2(complex_value, 128);
  mpcx_init(g, 3, 128);

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

  if (!failed)
    puts("mpfrcx-ok real-eval=25.0 real-derivative=10.0 complex-eval=1.0+2.0i");

  mpcx_clear(g);
  mpc_clear(complex_value);
  mpc_clear(z);
  mpc_clear(ccoeff);
  mpfrx_clear(derivative);
  mpfrx_clear(square);
  mpfrx_clear(f);
  mpfr_clear(deriv_value);
  mpfr_clear(real_value);
  mpfr_clear(x);
  mpfr_clear(coeff);
  return failed ? 1 : 0;
}
