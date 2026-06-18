#include <givaro/extension.h>
#include <givaro/givintprime.h>
#include <givaro/givinteger.h>
#include <givaro/givmatrix.h>
#include <givaro/givpoly1.h>
#include <givaro/givrational.h>
#include <givaro/gfq.h>
#include <givaro/modular.h>

#include <iostream>
#include <sstream>
#include <string>

using Givaro::Dense;
using Givaro::GFqDom;
using Givaro::Integer;
using Givaro::IntegerDom;
using Givaro::MatrixDom;
using Givaro::Modular;
using Givaro::Poly1Dom;
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

  IntegerDom integers;
  Integer gcd, bezout_u, bezout_v;
  const Integer gcd_left("240");
  const Integer gcd_right("46");
  integers.gcd(gcd, bezout_u, bezout_v, gcd_left, gcd_right);
  const Integer bezout_check = bezout_u * gcd_left + bezout_v * gcd_right;

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

  GFqDom<int64_t> z13(13, 1);
  Poly1Dom<GFqDom<int64_t>, Dense> z13_polys(z13, Givaro::Indeter("X"));
  Poly1Dom<GFqDom<int64_t>, Dense>::Element poly_left;
  Poly1Dom<GFqDom<int64_t>, Dense>::Element poly_right;
  Poly1Dom<GFqDom<int64_t>, Dense>::Element poly_product;
  Poly1Dom<GFqDom<int64_t>, Dense>::Element poly_gcd;
  Poly1Dom<GFqDom<int64_t>, Dense>::Element expected_poly_product;
  Poly1Dom<GFqDom<int64_t>, Dense>::Element expected_poly_gcd;
  z13_polys.init(poly_left, {1, 3, 2});
  z13_polys.init(poly_right, {2, 3, 1});
  z13_polys.init(expected_poly_product, {2, 9, 1, 9, 2});
  z13_polys.init(expected_poly_gcd, {10, 10});
  z13_polys.mul(poly_product, poly_left, poly_right);
  z13_polys.gcd(poly_gcd, poly_left, poly_right);

  std::ostringstream factorial_out;
  factorial_out << factorial;
  std::ostringstream rational_out;
  rational_out << two_thirds;

  const bool ok_factorial =
      factorial_out.str() == "265252859812191058636308480000000";
  const bool ok_rational = two_thirds == four_sixths;
  const bool ok_integer_gcd = gcd == Integer(2) && bezout_check == gcd;
  const bool ok_field = field.areEqual(z, field.one);
  const bool ok_gf4_matrix = gf4_vectors.areEqual(product, expected_product);
  const bool ok_polynomial =
      z13_polys.areEqual(poly_product, expected_poly_product) &&
      z13_polys.areEqual(poly_gcd, expected_poly_gcd);

  if (!ok_factorial || !ok_rational || !ok_integer_gcd || !ok_field ||
      !ok_gf4_matrix || !ok_polynomial) {
    std::cerr << "unexpected Givaro smoke result:"
              << " factorial=" << ok_factorial
              << " rational=" << ok_rational
              << " egcd=" << ok_integer_gcd
              << " mod17=" << ok_field
              << " gf4-matrix=" << ok_gf4_matrix
              << " z13-polys=" << ok_polynomial << "\n";
    if (!ok_integer_gcd) {
      std::cerr << "egcd gcd=" << gcd << " bezout=" << bezout_check << "\n";
    }
    if (!ok_polynomial) {
      z13_polys.write(std::cerr << "z13 product=", poly_product) << "\n";
      z13_polys.write(std::cerr << "z13 gcd=", poly_gcd) << "\n";
    }
    return 1;
  }

  std::cout << "givaro-ok factorial=" << factorial_out.str()
            << " rational=" << rational_out.str() << " egcd=2"
            << " mod17=1 gf4-matrix=checked z13-polys=checked\n";
  return 0;
}
