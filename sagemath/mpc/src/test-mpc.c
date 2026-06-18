#include <mpc.h>
#include <mpfr.h>
#include <stdio.h>
#include <string.h>

static int check_complex(const char *label, mpc_t value,
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
  mpfr_t zero;
  mpfr_t pi;
  mpfr_t half_pi_real;
  mpc_t z;
  mpc_t square;
  mpc_t cube;
  mpc_t quotient;
  mpc_t minus_one;
  mpc_t root;
  mpc_t euler_input;
  mpc_t euler_exp;
  mpc_t minus_one_log;
  mpc_t half_pi;
  mpc_t sine;
  int failed = 0;

  mpfr_init2(zero, 128);
  mpfr_init2(pi, 128);
  mpfr_init2(half_pi_real, 128);
  mpc_init2(z, 128);
  mpc_init2(square, 128);
  mpc_init2(cube, 128);
  mpc_init2(quotient, 128);
  mpc_init2(minus_one, 128);
  mpc_init2(root, 128);
  mpc_init2(euler_input, 128);
  mpc_init2(euler_exp, 128);
  mpc_init2(minus_one_log, 128);
  mpc_init2(half_pi, 128);
  mpc_init2(sine, 128);

  mpfr_set_ui(zero, 0, MPFR_RNDN);
  mpfr_const_pi(pi, MPFR_RNDN);
  mpfr_div_ui(half_pi_real, pi, 2, MPFR_RNDN);

  mpc_set_ui_ui(z, 1, 1, MPC_RNDNN);
  mpc_mul(square, z, z, MPC_RNDNN);
  mpc_pow_ui(cube, z, 3, MPC_RNDNN);
  mpc_div(quotient, square, z, MPC_RNDNN);
  mpc_set_si_si(minus_one, -1, 0, MPC_RNDNN);
  mpc_sqrt(root, minus_one, MPC_RNDNN);
  mpc_set_fr_fr(euler_input, zero, pi, MPC_RNDNN);
  mpc_exp(euler_exp, euler_input, MPC_RNDNN);
  mpc_log(minus_one_log, minus_one, MPC_RNDNN);
  mpc_set_fr(half_pi, half_pi_real, MPC_RNDNN);
  mpc_sin(sine, half_pi, MPC_RNDNN);

  failed |= check_complex("square", square, "0.0", "2.0");
  failed |= check_complex("cube", cube, "-2.0", "2.0");
  failed |= check_complex("quotient", quotient, "1.0", "1.0");
  failed |= check_complex("sqrt-minus-one", root, "0.0", "1.0");
  failed |= check_complex("exp-i-pi", euler_exp, "-1.0", "0.0");
  failed |= check_complex("log-minus-one", minus_one_log, "0.0", "3.1");
  failed |= check_complex("sin-pi-half", sine, "1.0", "0.0");

  if (!failed)
    puts("mpc-ok square=0.0+2.0i cube=-2.0+2.0i "
         "div=1.0+1.0i sqrt=-1->1.0i "
         "exp-i-pi=-1.0+0.0i log-minus-one=0.0+3.1i "
         "sin-pi-half=1.0+0.0i");

  mpfr_clear(zero);
  mpfr_clear(pi);
  mpfr_clear(half_pi_real);
  mpc_clear(z);
  mpc_clear(square);
  mpc_clear(cube);
  mpc_clear(quotient);
  mpc_clear(minus_one);
  mpc_clear(root);
  mpc_clear(euler_input);
  mpc_clear(euler_exp);
  mpc_clear(minus_one_log);
  mpc_clear(half_pi);
  mpc_clear(sine);
  mpfr_free_cache();
  return failed ? 1 : 0;
}
