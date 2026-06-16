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
  mpc_t z;
  mpc_t square;
  mpc_t cube;
  mpc_t quotient;
  mpc_t minus_one;
  mpc_t root;
  int failed = 0;

  mpc_init2(z, 128);
  mpc_init2(square, 128);
  mpc_init2(cube, 128);
  mpc_init2(quotient, 128);
  mpc_init2(minus_one, 128);
  mpc_init2(root, 128);

  mpc_set_ui_ui(z, 1, 1, MPC_RNDNN);
  mpc_mul(square, z, z, MPC_RNDNN);
  mpc_pow_ui(cube, z, 3, MPC_RNDNN);
  mpc_div(quotient, square, z, MPC_RNDNN);
  mpc_set_si_si(minus_one, -1, 0, MPC_RNDNN);
  mpc_sqrt(root, minus_one, MPC_RNDNN);

  failed |= check_complex("square", square, "0.0", "2.0");
  failed |= check_complex("cube", cube, "-2.0", "2.0");
  failed |= check_complex("quotient", quotient, "1.0", "1.0");
  failed |= check_complex("sqrt-minus-one", root, "0.0", "1.0");

  if (!failed)
    puts("mpc-ok square=0.0+2.0i cube=-2.0+2.0i "
         "div=1.0+1.0i sqrt=-1->1.0i");

  mpc_clear(z);
  mpc_clear(square);
  mpc_clear(cube);
  mpc_clear(quotient);
  mpc_clear(minus_one);
  mpc_clear(root);
  return failed ? 1 : 0;
}
