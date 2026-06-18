#include <stdio.h>
#include <stdlib.h>

#include <gmp.h>
#include <iml.h>

static int check_modular_matrix(void) {
  Double det_matrix[4] = {1, 2, 3, 4};
  Double rank_matrix[6] = {1, 2, 3, 2, 4, 6};
  Double inverse_matrix[4] = {1, 2, 3, 4};
  Double basis_matrix[6] = {1, 2, 3, 2, 4, 6};
  Double *row_basis = NULL;
  Double *left_nullspace = NULL;
  const long det = mDeterminant(101, det_matrix, 2);
  const long rank = mRank(101, rank_matrix, 2, 3);
  const long inverse_ok = mInverse(101, inverse_matrix, 2);
  const long basis_rank = mBasis(101, basis_matrix, 2, 3, 1, 1, &row_basis,
                                 &left_nullspace);
  int failed = 0;

  if (det != 99 || rank != 1) {
    fprintf(stderr, "unexpected modular results: det=%ld rank=%ld\n", det, rank);
    failed = 1;
  }

  if (!inverse_ok || (long)inverse_matrix[0] != 99 ||
      (long)inverse_matrix[1] != 1 || (long)inverse_matrix[2] != 52 ||
      (long)inverse_matrix[3] != 50) {
    fprintf(stderr, "unexpected modular inverse: ok=%ld entries=%ld,%ld,%ld,%ld\n",
            inverse_ok, (long)inverse_matrix[0], (long)inverse_matrix[1],
            (long)inverse_matrix[2], (long)inverse_matrix[3]);
    failed = 1;
  }

  if (basis_rank != 1 || row_basis == NULL || left_nullspace == NULL) {
    fprintf(stderr, "unexpected modular basis result: rank=%ld basis=%p nullspace=%p\n",
            basis_rank, (void *)row_basis, (void *)left_nullspace);
    failed = 1;
  } else {
    for (long column = 0; column < 3; column++) {
      const long dot = ((long)left_nullspace[0] * (long)basis_matrix[column] +
                        (long)left_nullspace[1] *
                            (long)basis_matrix[3 + column]) %
                       101;
      if (dot != 0) {
        fprintf(stderr, "left nullspace vector failed column %ld: %ld\n",
                column, dot);
        failed = 1;
      }
    }
  }

  free(row_basis);
  free(left_nullspace);
  return failed;
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

static int check_nullspace(void) {
  const long n = 2;
  const long m = 3;
  const long a[6] = {1, 2, 3, 2, 4, 6};
  mpz_t *nullspace = NULL;
  mpz_t dot;
  long dimension;
  long row;
  long column;
  long vector;
  int failed = 0;

  dimension = nullspaceLong(n, m, a, &nullspace);
  if (dimension != 2) {
    fprintf(stderr, "unexpected nullspace dimension: %ld\n", dimension);
    if (nullspace != NULL) {
      for (column = 0; column < m * dimension; column++) {
        mpz_clear(nullspace[column]);
      }
      free(nullspace);
    }
    return 1;
  }

  mpz_init(dot);
  for (row = 0; row < n; row++) {
    for (vector = 0; vector < dimension; vector++) {
      mpz_set_ui(dot, 0);
      for (column = 0; column < m; column++) {
        if (a[row * m + column] < 0) {
          mpz_submul_ui(dot, nullspace[column * dimension + vector],
                        labs(a[row * m + column]));
        } else {
          mpz_addmul_ui(dot, nullspace[column * dimension + vector],
                        a[row * m + column]);
        }
      }
      if (mpz_sgn(dot) != 0) {
        gmp_fprintf(stderr, "nullspace vector %ld failed row %ld: %Zd\n",
                    vector, row, dot);
        failed = 1;
      }
    }
  }

  mpz_clear(dot);
  for (column = 0; column < m * dimension; column++) {
    mpz_clear(nullspace[column]);
  }
  free(nullspace);

  return failed;
}

int main(void) {
  if (check_modular_matrix() != 0 || check_exact_solve() != 0 ||
      check_nullspace() != 0) {
    return 1;
  }

  puts("iml-ok det=99 rank=1 inverse=99,1,52,50 modular-basis=rank1 "
       "solution=(1/5,3/5) nullspace-dim=2");
  return 0;
}
