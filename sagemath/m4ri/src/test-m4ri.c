#include <m4ri/m4ri.h>
#include <stdio.h>

static void write_entry(mzd_t *matrix, rci_t row, rci_t col, int value) {
  mzd_write_bit(matrix, row, col, value != 0);
}

static int expect_entry(mzd_t const *matrix, rci_t row, rci_t col, int expected) {
  return mzd_read_bit(matrix, row, col) == (expected != 0);
}

int main(void) {
  mzd_t *a = mzd_init(2, 3);
  mzd_t *b = mzd_init(3, 2);
  mzd_t *rank_probe = mzd_init(3, 3);

  if (a == NULL || b == NULL || rank_probe == NULL) {
    return 1;
  }

  write_entry(a, 0, 0, 1);
  write_entry(a, 0, 2, 1);
  write_entry(a, 1, 1, 1);
  write_entry(a, 1, 2, 1);

  write_entry(b, 0, 0, 1);
  write_entry(b, 0, 1, 1);
  write_entry(b, 1, 0, 1);
  write_entry(b, 2, 1, 1);

  mzd_t *product = mzd_mul(NULL, a, b, 0);
  if (product == NULL) {
    mzd_free(a);
    mzd_free(b);
    mzd_free(rank_probe);
    return 1;
  }

  write_entry(rank_probe, 0, 0, 1);
  write_entry(rank_probe, 0, 1, 1);
  write_entry(rank_probe, 1, 1, 1);
  write_entry(rank_probe, 1, 2, 1);
  write_entry(rank_probe, 2, 0, 1);
  write_entry(rank_probe, 2, 2, 1);

  rci_t rank = mzd_echelonize(rank_probe, 1);
  int ok = rank == 2 &&
           expect_entry(product, 0, 0, 1) &&
           expect_entry(product, 0, 1, 0) &&
           expect_entry(product, 1, 0, 1) &&
           expect_entry(product, 1, 1, 1);

  printf("m4ri-ok rank=%d product=%d%d%d%d\n",
         (int)rank,
         (int)mzd_read_bit(product, 0, 0),
         (int)mzd_read_bit(product, 0, 1),
         (int)mzd_read_bit(product, 1, 0),
         (int)mzd_read_bit(product, 1, 1));

  mzd_free(product);
  mzd_free(a);
  mzd_free(b);
  mzd_free(rank_probe);

  return ok ? 0 : 1;
}
