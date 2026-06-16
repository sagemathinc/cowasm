#include <gf2x.h>
#include <stdio.h>

int main(void) {
  unsigned long a[1] = {0x13UL}; /* x^4 + x + 1 */
  unsigned long b[1] = {0x7UL};  /* x^2 + x + 1 */
  unsigned long product[2] = {0, 0};

  if (gf2x_mul(product, a, 1, b, 1) != 0) {
    return 1;
  }

  if (product[0] != 0x79UL || product[1] != 0) {
    fprintf(stderr, "unexpected gf2x product: 0x%lx 0x%lx\n", product[0], product[1]);
    return 1;
  }

  gf2x_mul_pool_t pool;
  gf2x_mul_pool_init(pool);
  product[0] = product[1] = 0;
  if (gf2x_mul_r(product, a, 1, b, 1, pool) != 0) {
    gf2x_mul_pool_clear(pool);
    return 1;
  }
  gf2x_mul_pool_clear(pool);

  if (product[0] != 0x79UL || product[1] != 0) {
    fprintf(stderr, "unexpected gf2x reentrant product: 0x%lx 0x%lx\n", product[0], product[1]);
    return 1;
  }

  printf("gf2x-ok version=%d product=0x%lx\n", gf2x_lib_version_code, product[0]);
  return 0;
}
