#include <stdio.h>

#include <zn_poly/zn_poly.h>

static int check_array(const char *label, const unsigned long *actual,
                       const unsigned long *expected, size_t length) {
  for (size_t i = 0; i < length; i++) {
    if (actual[i] != expected[i]) {
      fprintf(stderr, "%s[%zu]: expected %lu, got %lu\n", label, i,
              expected[i], actual[i]);
      return 1;
    }
  }
  return 0;
}

int main(void) {
  zn_mod_t mod;
  zn_mod_init(mod, 17);

  const unsigned long a[] = {3, 5, 2};
  const unsigned long b[] = {7, 4};
  const unsigned long c[] = {7, 4, 6};
  const unsigned long expected_product[] = {4, 13, 0, 8};
  const unsigned long expected_square[] = {9, 13, 3, 3, 4};
  const unsigned long expected_middle[] = {13, 0};
  const unsigned long expected_scaled[] = {12, 3, 8};
  const unsigned long expected_difference[] = {13, 1, 13};
  const unsigned long expected_negated[] = {14, 12, 15};
  unsigned long product[4] = {0, 0, 0, 0};
  unsigned long square[5] = {0, 0, 0, 0, 0};
  unsigned long middle[2] = {0, 0};
  unsigned long scaled[3] = {0, 0, 0};
  unsigned long difference[3] = {0, 0, 0};
  unsigned long negated[3] = {0, 0, 0};
  unsigned long copied[3] = {0, 0, 0};
  int status = 0;

  zn_array_mul(product, a, 3, b, 2, mod);
  zn_array_mul(square, a, 3, a, 3, mod);
  zn_array_mulmid(middle, a, 3, b, 2, mod);
  zn_array_scalar_mul(scaled, a, 3, 4, mod);
  zn_array_sub(difference, a, c, 3, mod);
  zn_array_neg(negated, a, 3, mod);
  zn_array_copy(copied, a, 3);

  status |= check_array("product", product, expected_product, 4);
  status |= check_array("square", square, expected_square, 5);
  status |= check_array("middle", middle, expected_middle, 2);
  status |= check_array("scaled", scaled, expected_scaled, 3);
  status |= check_array("difference", difference, expected_difference, 3);
  status |= check_array("negated", negated, expected_negated, 3);

  if (zn_array_cmp(copied, a, 3) != 0) {
    fprintf(stderr, "copied array differs from input\n");
    status = 1;
  }

  zn_array_zero(copied, 3);
  if (copied[0] != 0 || copied[1] != 0 || copied[2] != 0) {
    fprintf(stderr, "zeroed array is not zero\n");
    status = 1;
  }

  if (zn_mod_invert(5, mod) != 7) {
    fprintf(stderr, "modular inverse: expected 7, got %lu\n",
            zn_mod_invert(5, mod));
    status = 1;
  }

  if (zn_mod_pow(5, 3, mod) != 6) {
    fprintf(stderr, "modular power: expected 6, got %lu\n",
            zn_mod_pow(5, 3, mod));
    status = 1;
  }

  if (status == 0) {
    printf("zn-poly-ok product square middle scalar sub neg copy zero "
           "mod-inverse mod-pow\n");
  }

  zn_mod_clear(mod);
  return status;
}
