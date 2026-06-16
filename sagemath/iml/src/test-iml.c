#include <stdio.h>
#include <stdlib.h>

#include <gmp.h>
#include <iml.h>

static int check_modular_matrix(void) {
  Double det_matrix[4] = {1, 2, 3, 4};
  Double rank_matrix[6] = {1, 2, 3, 2, 4, 6};
  const long det = mDeterminant(101, det_matrix, 2);
  const long rank = mRank(101, rank_matrix, 2, 3);

  if (det != 99 || rank != 1) {
    fprintf(stderr, "unexpected modular results: det=%ld rank=%ld\n", det, rank);
    return 1;
  }
  return 0;
}

static int check_exact_solve(void) {
  const long n = 2;
  const long m = 1;
  const long a[4] = {2, 1, 1, 3};
  mpz_t b[2];
  mpz_t numerator[2];
  mpz_t denominator;
  int failed = 0;

  mpz_init_set_si(b[0], 1);
  mpz_init_set_si(b[1], 2);
  mpz_init(numerator[0]);
  mpz_init(numerator[1]);
  mpz_init(denominator);

  nonsingSolvMM(RightSolu, n, m, a, b, numerator, denominator);

  if (mpz_cmp_ui(denominator, 5) != 0 ||
      mpz_cmp_ui(numerator[0], 1) != 0 ||
      mpz_cmp_ui(numerator[1], 3) != 0) {
    gmp_fprintf(stderr, "unexpected solve result: denominator=%Zd numerator=(%Zd,%Zd)\n",
                denominator, numerator[0], numerator[1]);
    failed = 1;
  }

  mpz_clear(denominator);
  mpz_clear(numerator[1]);
  mpz_clear(numerator[0]);
  mpz_clear(b[1]);
  mpz_clear(b[0]);

  return failed;
}

int main(void) {
  if (check_modular_matrix() != 0 || check_exact_solve() != 0) {
    return 1;
  }

  puts("iml-ok det=99 rank=1 solution=(1/5,3/5)");
  return 0;
}
