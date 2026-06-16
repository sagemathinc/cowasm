#include <stdio.h>

#include <zn_poly/zn_poly.h>

int main(void) {
  zn_mod_t mod;
  zn_mod_init(mod, 17);

  const unsigned long a[] = {3, 5, 2};
  const unsigned long b[] = {7, 4};
  unsigned long product[4] = {0, 0, 0, 0};
  unsigned long middle[2] = {0, 0};

  zn_array_mul(product, a, 3, b, 2, mod);
  zn_array_mulmid(middle, a, 3, b, 2, mod);

  printf("zn-poly-ok product=%lu,%lu,%lu,%lu middle=%lu,%lu inverse=%lu\n",
         product[0], product[1], product[2], product[3], middle[0], middle[1],
         zn_mod_invert(5, mod));

  zn_mod_clear(mod);
  return 0;
}
