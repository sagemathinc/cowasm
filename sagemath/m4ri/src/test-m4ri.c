#include <m4ri/m4ri.h>
#include <stdio.h>

static void write_entry(mzd_t *matrix, rci_t row, rci_t col, int value) {
  mzd_write_bit(matrix, row, col, value != 0);
}

static int expect_entry(mzd_t const *matrix, rci_t row, rci_t col, int expected) {
  return mzd_read_bit(matrix, row, col) == (expected != 0);
}

static int check_solve_left(void) {
  mzd_t *system = mzd_init(3, 3);
  mzd_t *rhs = mzd_init(3, 2);
  mzd_t *expected = mzd_init(3, 2);
  int ok;

  if (system == NULL || rhs == NULL || expected == NULL) {
    mzd_free(system);
    mzd_free(rhs);
    mzd_free(expected);
    return 0;
  }

  write_entry(system, 0, 0, 1);
  write_entry(system, 0, 1, 1);
  write_entry(system, 1, 1, 1);
  write_entry(system, 1, 2, 1);
  write_entry(system, 2, 0, 1);

  write_entry(expected, 0, 0, 1);
  write_entry(expected, 1, 1, 1);
  write_entry(expected, 2, 0, 1);
  write_entry(expected, 2, 1, 1);

  write_entry(rhs, 0, 0, 1);
  write_entry(rhs, 0, 1, 1);
  write_entry(rhs, 1, 0, 1);
  write_entry(rhs, 2, 0, 1);

  ok = mzd_solve_left(system, rhs, 0, 1) == 0 && mzd_equal(rhs, expected);

  mzd_free(system);
  mzd_free(rhs);
  mzd_free(expected);
  return ok;
}

static int check_kernel_left(void) {
  mzd_t *system = mzd_init(2, 3);
  mzd_t *system_copy = NULL;
  mzd_t *kernel = NULL;
  mzd_t *product = NULL;
  int ok;

  if (system == NULL) {
    return 0;
  }

  write_entry(system, 0, 0, 1);
  write_entry(system, 0, 1, 1);
  write_entry(system, 1, 1, 1);
  write_entry(system, 1, 2, 1);

  system_copy = mzd_copy(NULL, system);
  kernel = mzd_kernel_left_pluq(system, 0);
  if (system_copy != NULL && kernel != NULL) {
    product = mzd_mul(NULL, system_copy, kernel, 0);
  }

  ok = system_copy != NULL && kernel != NULL && product != NULL;
  ok = ok && kernel->nrows == 3 && kernel->ncols == 1;
  ok = ok && expect_entry(kernel, 0, 0, 1) &&
       expect_entry(kernel, 1, 0, 1) && expect_entry(kernel, 2, 0, 1);
  ok = ok && mzd_is_zero(product);

  mzd_free(product);
  mzd_free(kernel);
  mzd_free(system_copy);
  mzd_free(system);
  return ok;
}

static int check_inverse(void) {
  mzd_t *matrix = mzd_init(3, 3);
  mzd_t *identity = mzd_init(3, 3);
  mzd_t *inverse = NULL;
  mzd_t *product = NULL;
  int ok;

  if (matrix == NULL || identity == NULL) {
    mzd_free(matrix);
    mzd_free(identity);
    return 0;
  }

  write_entry(matrix, 0, 0, 1);
  write_entry(matrix, 0, 1, 1);
  write_entry(matrix, 1, 1, 1);
  write_entry(matrix, 1, 2, 1);
  write_entry(matrix, 2, 0, 1);

  write_entry(identity, 0, 0, 1);
  write_entry(identity, 1, 1, 1);
  write_entry(identity, 2, 2, 1);

  inverse = mzd_inv_m4ri(NULL, matrix, 0);
  if (inverse != NULL) {
    product = mzd_mul(NULL, matrix, inverse, 0);
  }

  ok = inverse != NULL && product != NULL && mzd_equal(product, identity);

  mzd_free(product);
  mzd_free(inverse);
  mzd_free(identity);
  mzd_free(matrix);
  return ok;
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
           expect_entry(product, 1, 1, 1) &&
           check_solve_left() &&
           check_kernel_left() &&
           check_inverse();

  printf("m4ri-ok rank=%d product=%d%d%d%d solve kernel inverse\n",
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
