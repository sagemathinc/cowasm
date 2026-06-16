#include <linbox/linbox-config.h>

#include <cstddef>
#include <cstdint>
#include <iostream>

#include <givaro/zring.h>
#include <givaro/modular.h>
#include <linbox/algorithms/matrix-blas3/mul.h>
#include <linbox/integer.h>
#include <linbox/matrix/densematrix/blas-matrix.h>
#include <linbox/matrix/dense-matrix.h>
#include <linbox/matrix/matrix-domain.h>
#include <linbox/ring/ntl.h>

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

int main() {
  if (!test_modular_product() || !test_flint_product() || !test_ntl_ring()) {
    return 1;
  }

  std::cout << "linbox-ok product=2,5,9,16 mod17 flint=7,10,15,22 ntl=42\n";
  return 0;
}
