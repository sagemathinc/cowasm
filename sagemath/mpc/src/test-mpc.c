#include <mpc.h>
#include <mpfr.h>
#include <stdio.h>
#include <string.h>

int main(void) {
  mpc_t z;
  mpc_t square;
  char real[64];
  char imag[64];

  mpc_init2(z, 128);
  mpc_init2(square, 128);

  mpc_set_ui_ui(z, 1, 1, MPC_RNDNN);
  mpc_mul(square, z, z, MPC_RNDNN);

  mpfr_snprintf(real, sizeof(real), "%.1RNf", mpc_realref(square));
  mpfr_snprintf(imag, sizeof(imag), "%.1RNf", mpc_imagref(square));
  printf("%s + %si\n", real, imag);

  if (strcmp(real, "0.0") != 0 || strcmp(imag, "2.0") != 0) {
    mpc_clear(z);
    mpc_clear(square);
    return 1;
  }

  mpc_clear(z);
  mpc_clear(square);
  return 0;
}
