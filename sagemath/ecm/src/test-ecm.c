#include <ecm.h>
#include <gmp.h>
#include <stdio.h>
#include <string.h>

int main(void) {
  ecm_params params;
  mpz_t n;
  mpz_t f;
  int pm1_status;
  int ecm_status;
  int ok;

  ecm_init(params);
  params->method = ECM_PM1;

  mpz_init_set_ui(n, 12345678UL);
  mpz_init(f);

  pm1_status = ecm_factor(f, n, 1000.0, params);
  ok = pm1_status > 0 && mpz_cmp_ui(f, 2) == 0 &&
       strcmp(ecm_version(), "7.0.7") == 0;

  ecm_reset(params);
  params->method = ECM_ECM;
  params->param = ECM_PARAM_SUYAMA;
  mpz_set_ui(params->sigma, 7);
  mpz_set_ui(params->B2, 1000000);
  params->k = 1;
  mpz_set_str(n, "2050449353925555290706354283", 10);
  mpz_set_ui(f, 0);

  ecm_status = ecm_factor(f, n, 30.0, params);
  ok = ok && ecm_status > 0 && mpz_cmp_ui(f, 30210181) == 0;

  gmp_printf("ecm-ok pm1-status=%d pm1-factor=2 ecm-status=%d "
             "ecm-factor=%Zd version=%s\n",
             pm1_status, ecm_status, f, ecm_version());

  mpz_clear(f);
  mpz_clear(n);
  ecm_clear(params);

  return ok ? 0 : 1;
}
