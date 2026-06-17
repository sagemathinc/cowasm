#include <linbox/linbox-config.h>

#include <cstddef>
#include <cstdint>
#include <iostream>

#include <fplll/fplll.h>
#include <givaro/zring.h>
#include <givaro/modular.h>
#include <linbox/algorithms/matrix-blas3/mul.h>
#include <linbox/integer.h>
#include <linbox/matrix/densematrix/blas-matrix.h>
#include <linbox/matrix/dense-matrix.h>
#include <linbox/matrix/matrix-domain.h>
#include <linbox/matrix/matrixdomain/blas-matrix-domain.h>
#include <linbox/ring/ntl.h>
#include <linbox/util/iml_wrapper.h>

#ifndef __LINBOX_HAVE_MPFR
#error "LinBox was not configured with MPFR support"
#endif

#ifndef __LINBOX_HAVE_FPLLL
#error "LinBox was not configured with fplll support"
#endif

#ifndef __LINBOX_HAVE_IML
#error "LinBox was not configured with IML support"
#endif

#ifndef __LINBOX_HAVE_FLINT
#error "LinBox was not configured with FLINT support"
#endif

#ifndef __LINBOX_HAVE_NTL
#error "LinBox was not configured with NTL support"
#endif

bool test_modular_product() {
  using Field = Givaro::Modular<int64_t>;

  Field field(17);
  LinBox::DenseMatrix<Field> left(field, 2, 2);
  LinBox::DenseMatrix<Field> right(field, 2, 2);
  LinBox::DenseMatrix<Field> product(field, 2, 2);

  Field::Element value;
  const int64_t left_entries[4] = {
      1, 2,
      3, 4,
  };
  const int64_t right_entries[4] = {
      5, 6,
      7, 8,
  };

  for (std::size_t row = 0; row < 2; row++) {
    for (std::size_t col = 0; col < 2; col++) {
      field.init(value, left_entries[row * 2 + col]);
      left.setEntry(row, col, value);
      field.init(value, right_entries[row * 2 + col]);
      right.setEntry(row, col, value);
    }
  }

  LinBox::MatrixDomain<Field> domain(field);
  domain.mul(product, left, right);

  const int64_t expected[4] = {
      2, 5,
      9, 16,
  };
  int64_t actual = 0;
  for (std::size_t row = 0; row < 2; row++) {
    for (std::size_t col = 0; col < 2; col++) {
      field.convert(actual, product.getEntry(row, col));
      if (actual != expected[row * 2 + col]) {
        std::cerr << "unexpected LinBox product entry at (" << row << ","
                  << col << "): " << actual << "\n";
        return false;
      }
    }
  }

  return true;
}

bool test_flint_product() {
  using Field = Givaro::ZRing<LinBox::Integer>;
  using Matrix = LinBox::BlasMatrix<Field>;

  Field integers;
  Matrix left(integers, 2, 2);
  Matrix right(integers, 2, 2);
  Matrix product(integers, 2, 2);

  const int64_t left_entries[4] = {
      1, 2,
      3, 4,
  };
  const int64_t right_entries[4] = {
      1, 2,
      3, 4,
  };

  for (std::size_t row = 0; row < 2; row++) {
    for (std::size_t col = 0; col < 2; col++) {
      left.setEntry(row, col, LinBox::Integer(left_entries[row * 2 + col]));
      right.setEntry(row, col, LinBox::Integer(right_entries[row * 2 + col]));
    }
  }

  LinBox::BLAS3::mul(product, left, right, LinBox::BLAS3::mulMethod::FLINT());

  const int64_t expected[4] = {
      7, 10,
      15, 22,
  };
  for (std::size_t row = 0; row < 2; row++) {
    for (std::size_t col = 0; col < 2; col++) {
      if (product.getEntry(row, col) != LinBox::Integer(expected[row * 2 + col])) {
        std::cerr << "unexpected FLINT product entry at (" << row << ","
                  << col << "): " << product.getEntry(row, col) << "\n";
        return false;
      }
    }
  }

  return true;
}

bool test_modular_rank_det() {
  using Field = Givaro::Modular<int64_t>;
  using Matrix = LinBox::BlasMatrix<Field>;

  Field field(17);
  LinBox::BlasMatrixDomain<Field> domain(field);

  Matrix full_rank(field, 3, 3);
  Matrix rank_deficient(field, 3, 3);
  const int64_t full_rank_entries[9] = {
      1, 2, 3,
      0, 4, 5,
      1, 0, 6,
  };
  const int64_t rank_deficient_entries[9] = {
      1, 2, 3,
      2, 4, 6,
      4, 5, 6,
  };

  Field::Element value;
  for (std::size_t row = 0; row < 3; row++) {
    for (std::size_t col = 0; col < 3; col++) {
      field.init(value, full_rank_entries[row * 3 + col]);
      full_rank.setEntry(row, col, value);
      field.init(value, rank_deficient_entries[row * 3 + col]);
      rank_deficient.setEntry(row, col, value);
    }
  }

  Field::Element det = domain.detInPlace(full_rank);
  int64_t det_int = 0;
  field.convert(det_int, det);
  const unsigned int rank = domain.rankInPlace(rank_deficient);

  if (det_int != 5 || rank != 2) {
    std::cerr << "unexpected LinBox rank/det: det=" << det_int
              << " rank=" << rank << "\n";
    return false;
  }

  return true;
}

bool test_ntl_ring() {
  LinBox::NTL_ZZ integers;
  LinBox::NTL_ZZ::Element left;
  LinBox::NTL_ZZ::Element right;
  LinBox::NTL_ZZ::Element product;
  LinBox::integer actual;

  integers.init(left, static_cast<int64_t>(6));
  integers.init(right, static_cast<int64_t>(7));
  integers.mul(product, left, right);
  integers.convert(actual, product);

  if (actual != LinBox::integer(42)) {
    std::cerr << "unexpected NTL_ZZ product: " << actual << "\n";
    return false;
  }

  return true;
}

bool test_fplll_reduction() {
  fplll::ZZ_mat<mpz_t> basis(3, 3);
  basis[0][0] = 105;
  basis[0][1] = 821;
  basis[0][2] = 17;
  basis[1][0] = 4;
  basis[1][1] = 34;
  basis[1][2] = 9;
  basis[2][0] = 29;
  basis[2][1] = 8;
  basis[2][2] = 77;

  const int status = fplll::lll_reduction(basis);
  if (status != fplll::RED_SUCCESS) {
    std::cerr << "LLL reduction failed: "
              << fplll::get_red_status_str(status) << "\n";
    return false;
  }

  fplll::ZZ_mat<mpz_t> transform;
  fplll::ZZ_mat<mpz_t> inverse_transform;
  fplll::MatGSO<fplll::Z_NR<mpz_t>, fplll::FP_NR<mpfr_t>> gso(
      basis, transform, inverse_transform, 0);
  if (!fplll::is_lll_reduced<fplll::Z_NR<mpz_t>, fplll::FP_NR<mpfr_t>>(
          gso, fplll::LLL_DEF_DELTA, fplll::LLL_DEF_ETA)) {
    std::cerr << "output basis is not LLL reduced\n";
    return false;
  }

  return basis[0][0] == 4 && basis[0][1] == 34 && basis[0][2] == 9;
}

bool test_iml_exact_solve() {
  const long n = 2;
  const long m = 1;
  const long a[4] = {2, 1, 1, 3};
  mpz_t b[2];
  mpz_t numerator[2];
  mpz_t denominator;

  mpz_init_set_si(b[0], 1);
  mpz_init_set_si(b[1], 2);
  mpz_init(numerator[0]);
  mpz_init(numerator[1]);
  mpz_init(denominator);

  IML::nonsingSolvMM(IML::RightSolu, n, m, a, b, numerator, denominator);

  const bool ok = mpz_cmp_ui(denominator, 5) == 0 &&
                  mpz_cmp_ui(numerator[0], 1) == 0 &&
                  mpz_cmp_ui(numerator[1], 3) == 0;
  if (!ok) {
    gmp_fprintf(stderr,
                "unexpected IML solve result: denominator=%Zd numerator=(%Zd,%Zd)\n",
                denominator, numerator[0], numerator[1]);
  }

  mpz_clear(denominator);
  mpz_clear(numerator[1]);
  mpz_clear(numerator[0]);
  mpz_clear(b[1]);
  mpz_clear(b[0]);

  return ok;
}

int main() {
  if (!test_modular_product() || !test_flint_product() ||
      !test_modular_rank_det() || !test_ntl_ring() ||
      !test_fplll_reduction() || !test_iml_exact_solve()) {
    return 1;
  }

  std::cout << "linbox-ok product=2,5,9,16 mod17 flint=7,10,15,22"
            << " rank=2 det=5 ntl=42 fplll=4,34,9 iml=1/5,3/5\n";
  return 0;
}
