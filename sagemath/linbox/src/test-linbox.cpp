#include <linbox/linbox-config.h>

#include <cstddef>
#include <cstdint>
#include <iostream>

#include <givaro/modular.h>
#include <linbox/matrix/dense-matrix.h>
#include <linbox/matrix/matrix-domain.h>

#ifndef __LINBOX_HAVE_MPFR
#error "LinBox was not configured with MPFR support"
#endif

#ifndef __LINBOX_HAVE_FPLLL
#error "LinBox was not configured with fplll support"
#endif

#ifndef __LINBOX_HAVE_IML
#error "LinBox was not configured with IML support"
#endif

int main() {
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
        return 1;
      }
    }
  }

  std::cout << "linbox-ok product=2,5,9,16 mod17\n";
  return 0;
}
