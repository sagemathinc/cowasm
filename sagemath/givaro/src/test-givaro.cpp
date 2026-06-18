#include <givaro/extension.h>
#include <givaro/givinteger.h>
#include <givaro/givmatrix.h>
#include <givaro/givrational.h>
#include <givaro/gfq.h>
#include <givaro/modular.h>

#include <iostream>
#include <sstream>
#include <string>

using Givaro::Dense;
using Givaro::GFqDom;
using Givaro::Integer;
using Givaro::MatrixDom;
using Givaro::Modular;
using Givaro::Rational;
using Givaro::VectorDom;

int main() {
  Integer factorial(1);
  for (int i = 2; i <= 30; i++) {
    factorial *= i;
  }

  Rational one_third(1, 3);
  Rational two_thirds = one_third + one_third;
  Rational four_sixths(4, 6);

  Modular<int64_t> field(17);
  Modular<int64_t>::Element x, y, z;
  field.init(x, 5);
  field.init(y, 7);
  field.mul(z, x, y);

  GFqDom<int64_t> gf4(2, 2);
  VectorDom<GFqDom<int64_t>, Dense> gf4_vectors(gf4);
  MatrixDom<GFqDom<int64_t>, Dense> gf4_matrices(gf4);
  MatrixDom<GFqDom<int64_t>, Dense>::Element matrix;
  VectorDom<GFqDom<int64_t>, Dense>::Element vector, product, expected_product;
  gf4_matrices.init(matrix, 3, 3);
  gf4_vectors.init(vector, 3);
  gf4_vectors.init(product, 3);
  gf4_vectors.init(expected_product, 3);

  for (uint64_t i = 0; i < 9; ++i) {
    gf4.init(matrix(i / 3, i % 3), i);
  }
  for (uint64_t i = 0; i < 3; ++i) {
    gf4.init(vector[i], i + 1);
  }
  gf4_matrices.mul(product, matrix, gf4_vectors, vector);
  gf4.init(expected_product[0], 3);
  gf4.init(expected_product[1], 0);
  gf4.init(expected_product[2], 3);

  std::ostringstream factorial_out;
  factorial_out << factorial;
  std::ostringstream rational_out;
  rational_out << two_thirds;

  const bool ok_factorial =
      factorial_out.str() == "265252859812191058636308480000000";
  const bool ok_rational = two_thirds == four_sixths;
  const bool ok_field = field.areEqual(z, field.one);
  const bool ok_gf4_matrix = gf4_vectors.areEqual(product, expected_product);

  if (!ok_factorial || !ok_rational || !ok_field || !ok_gf4_matrix) {
    return 1;
  }

  std::cout << "givaro-ok factorial=" << factorial_out.str()
            << " rational=" << rational_out.str()
            << " mod17=1 gf4-matrix=checked\n";
  return 0;
}
