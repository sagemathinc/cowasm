#include <m4rie/m4rie.h>
#include <stdio.h>

static void write_entry(mzed_t *matrix, rci_t row, rci_t col, word value) {
  mzed_write_elem(matrix, row, col, value);
}

static int expect_entry(mzed_t const *matrix, rci_t row, rci_t col, word expected) {
  return mzed_read_elem(matrix, row, col) == expected;
}

int main(void) {
  gf2e *field = gf2e_init(0x7);
  if (field == NULL || field->degree != 2) {
    return 1;
  }

  mzed_t *a = mzed_init(field, 2, 2);
  mzed_t *b = mzed_init(field, 2, 2);
  if (a == NULL || b == NULL) {
    gf2e_free(field);
    return 1;
  }

  write_entry(a, 0, 0, 1);
  write_entry(a, 0, 1, 2);
  write_entry(a, 1, 0, 0);
  write_entry(a, 1, 1, 3);

  write_entry(b, 0, 0, 3);
  write_entry(b, 0, 1, 1);
  write_entry(b, 1, 0, 2);
  write_entry(b, 1, 1, 2);

  mzed_t *product = mzed_mul(NULL, a, b);
  mzed_t *sum = mzed_add(NULL, a, b);
  if (product == NULL || sum == NULL) {
    mzed_free(a);
    mzed_free(b);
    gf2e_free(field);
    return 1;
  }

  int ok = gf2e_mul(field, 2, 2) == 3 &&
           gf2e_inv(field, 2) == 3 &&
           expect_entry(product, 0, 0, 0) &&
           expect_entry(product, 0, 1, 2) &&
           expect_entry(product, 1, 0, 1) &&
           expect_entry(product, 1, 1, 1) &&
           expect_entry(sum, 0, 0, 2) &&
           expect_entry(sum, 0, 1, 3) &&
           expect_entry(sum, 1, 0, 2) &&
           expect_entry(sum, 1, 1, 1);

  printf("m4rie-ok degree=%d product=%lu%lu%lu%lu sum=%lu%lu%lu%lu\n",
         (int)field->degree,
         (unsigned long)mzed_read_elem(product, 0, 0),
         (unsigned long)mzed_read_elem(product, 0, 1),
         (unsigned long)mzed_read_elem(product, 1, 0),
         (unsigned long)mzed_read_elem(product, 1, 1),
         (unsigned long)mzed_read_elem(sum, 0, 0),
         (unsigned long)mzed_read_elem(sum, 0, 1),
         (unsigned long)mzed_read_elem(sum, 1, 0),
         (unsigned long)mzed_read_elem(sum, 1, 1));

  mzed_free(product);
  mzed_free(sum);
  mzed_free(a);
  mzed_free(b);
  gf2e_free(field);

  return ok ? 0 : 1;
}
