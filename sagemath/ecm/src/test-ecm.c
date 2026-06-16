#include <ecm.h>
#include <gmp.h>
#include <stdio.h>
#include <string.h>

int main(void) {
  ecm_params params;
  mpz_t n;
  mpz_t f;
  int status;
  int ok;

  ecm_init(params);
  params->method = ECM_PM1;

  mpz_init_set_ui(n, 12345678UL);
  mpz_init(f);

  status = ecm_factor(f, n, 1000.0, params);
  ok = status > 0 && mpz_cmp_ui(f, 2) == 0 &&
       strcmp(ecm_version(), "7.0.7") == 0;
  gmp_printf("ecm-ok status=%d factor=%Zd version=%s\n", status, f,
             ecm_version());

  mpz_clear(f);
  mpz_clear(n);
  ecm_clear(params);

  return ok ? 0 : 1;
}
