#include <gf2x.h>
#include <string.h>
#include <stdio.h>

static void reference_mul(unsigned long *product, size_t product_words,
                          const unsigned long *a, size_t an,
                          const unsigned long *b, size_t bn) {
  const size_t word_bits = sizeof(unsigned long) * 8;

  memset(product, 0, product_words * sizeof(product[0]));

  for (size_t ai = 0; ai < an; ai++) {
    for (size_t abit = 0; abit < word_bits; abit++) {
      if (((a[ai] >> abit) & 1UL) == 0) {
        continue;
      }

      for (size_t bi = 0; bi < bn; bi++) {
        for (size_t bbit = 0; bbit < word_bits; bbit++) {
          size_t bit_index;

          if (((b[bi] >> bbit) & 1UL) == 0) {
            continue;
          }

          bit_index = (ai + bi) * word_bits + abit + bbit;
          product[bit_index / word_bits] ^= 1UL << (bit_index % word_bits);
        }
      }
    }
  }
}

static int check_product(const char *label, const unsigned long *actual,
                         const unsigned long *expected, size_t words) {
  for (size_t i = 0; i < words; i++) {
    if (actual[i] != expected[i]) {
      fprintf(stderr, "unexpected gf2x %s word %lu: got 0x%lx expected 0x%lx\n",
              label, (unsigned long)i, actual[i], expected[i]);
      return 1;
    }
  }

  return 0;
}

int main(void) {
  unsigned long a[1] = {0x13UL}; /* x^4 + x + 1 */
  unsigned long b[1] = {0x7UL};  /* x^2 + x + 1 */
  unsigned long product[2] = {0, 0};
  unsigned long wide_a[2] = {0x80000013UL, 0x5UL};
  unsigned long wide_b[2] = {0x40000007UL, 0x3UL};
  unsigned long wide_product[4] = {0, 0, 0, 0};
  unsigned long wide_expected[4] = {0, 0, 0, 0};

  if (gf2x_mul(product, a, 1, b, 1) != 0) {
    return 1;
  }

  if (check_product("product", product, (unsigned long[]){0x79UL, 0}, 2)) {
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

  if (check_product("reentrant product", product, (unsigned long[]){0x79UL, 0},
                    2)) {
    return 1;
  }

  reference_mul(wide_expected, 4, wide_a, 2, wide_b, 2);
  if (gf2x_mul(wide_product, wide_a, 2, wide_b, 2) != 0) {
    return 1;
  }

  if (check_product("wide product", wide_product, wide_expected, 4)) {
    return 1;
  }

  gf2x_mul_pool_init(pool);
  memset(wide_product, 0, sizeof(wide_product));
  if (gf2x_mul_r(wide_product, wide_a, 2, wide_b, 2, pool) != 0) {
    gf2x_mul_pool_clear(pool);
    return 1;
  }
  gf2x_mul_pool_clear(pool);

  if (check_product("wide reentrant product", wide_product, wide_expected, 4)) {
    return 1;
  }

  printf("gf2x-ok version=%d product=0x%lx wide=%lx:%lx:%lx:%lx\n",
         gf2x_lib_version_code, product[0], wide_product[3], wide_product[2],
         wide_product[1], wide_product[0]);

  return 0;
}
