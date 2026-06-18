#include <NTL/GF2E.h>
#include <NTL/GF2EX.h>
#include <NTL/GF2EXFactoring.h>
#include <NTL/GF2X.h>
#include <NTL/GF2XFactoring.h>
#include <NTL/LLL.h>
#include <NTL/ZZ.h>
#include <NTL/ZZX.h>
#include <NTL/ZZ_p.h>
#include <NTL/ZZ_pX.h>
#include <NTL/ZZ_pXFactoring.h>
#include <NTL/config.h>
#include <NTL/mat_ZZ.h>

#ifndef NTL_GF2X_LIB
#error "NTL was not configured with GF2X support"
#endif

#include <iostream>
#include <sstream>
#include <string>

using namespace NTL;

namespace {

bool check_lattice_reduction(long &lattice_rank, ZZ &lattice_det) {
  mat_ZZ basis;
  basis.SetDims(3, 3);
  basis[0][0] = 105;
  basis[0][1] = 821;
  basis[0][2] = 17;
  basis[1][0] = 4;
  basis[1][1] = 34;
  basis[1][2] = 9;
  basis[2][0] = 29;
  basis[2][1] = 8;
  basis[2][2] = 77;

  mat_ZZ original = basis;
  mat_ZZ transform;
  lattice_rank = LLL(lattice_det, basis, transform);

  mat_ZZ transformed;
  mul(transformed, transform, original);

  ZZ original_det;
  determinant(original_det, original);
  if (original_det < 0) {
    negate(original_det, original_det);
  }
  ZZ original_det_square = sqr(original_det);

  return lattice_rank == 3 && lattice_det == original_det_square &&
         transformed == basis;
}

bool check_extension_field(long &extension_factors) {
  GF2X modulus;
  BuildIrred(modulus, 4);
  GF2E::init(modulus);

  GF2X generator_poly;
  SetX(generator_poly);
  GF2E alpha = to_GF2E(generator_poly);

  GF2E alpha_order = power(alpha, 15);
  if (!IsOne(alpha_order) || IsOne(alpha)) {
    return false;
  }

  GF2EX polynomial;
  SetCoeff(polynomial, 0, alpha);
  SetCoeff(polynomial, 1, alpha + 1);
  SetCoeff(polynomial, 2);

  vec_pair_GF2EX_long factors;
  CanZass(factors, polynomial);
  extension_factors = factors.length();

  GF2EX product;
  mul(product, factors);

  return extension_factors == 2 && product == polynomial;
}

bool check_modular_interpolation(long &interpolated_value,
                                 long &derivative_value) {
  ZZ_p::init(ZZ(97));

  vec_ZZ_p points;
  vec_ZZ_p values;
  points.SetLength(4);
  values.SetLength(4);

  for (long i = 0; i < 4; i++) {
    points[i] = to_ZZ_p(i);
    values[i] = 3 * power(to_ZZ_p(i), 3) + 2 * to_ZZ_p(i) + 5;
  }

  ZZ_pX polynomial;
  interpolate(polynomial, points, values);

  ZZ_pX expected;
  SetCoeff(expected, 0, 5);
  SetCoeff(expected, 1, 2);
  SetCoeff(expected, 3, 3);

  ZZ_p interpolated = eval(polynomial, to_ZZ_p(4));
  ZZ_p derivative = eval(diff(polynomial), to_ZZ_p(4));
  conv(interpolated_value, interpolated);
  conv(derivative_value, derivative);

  return polynomial == expected && interpolated == to_ZZ_p(11) &&
         derivative == to_ZZ_p(49);
}

} // namespace

int main() {
  ZZ n = power(ZZ(2), 200);
  std::ostringstream n_out;
  n_out << n;
  std::cout << n_out.str() << "\n";

  ZZX f;
  SetCoeff(f, 0, 1);
  SetCoeff(f, 1, 2);
  SetCoeff(f, 2, 1);
  ZZX square = sqr(f);

  ZZ_p::init(ZZ(17));
  ZZ_pX g;
  SetCoeff(g, 0, -1);
  SetCoeff(g, 2, 1);

  vec_pair_ZZ_pX_long factors;
  CanZass(factors, g);
  std::cout << factors.length() << "\n";

  GF2X binary_a;
  GF2X binary_b;
  SetCoeff(binary_a, 0);
  SetCoeff(binary_a, 1);
  SetCoeff(binary_a, 4);
  SetCoeff(binary_b, 0);
  SetCoeff(binary_b, 1);
  SetCoeff(binary_b, 2);
  GF2X binary_product = binary_a * binary_b;

  GF2X binary_factor_poly;
  SetCoeff(binary_factor_poly, 0);
  SetCoeff(binary_factor_poly, 3);
  vec_pair_GF2X_long binary_factors;
  CanZass(binary_factors, binary_factor_poly);

  mat_ZZ matrix;
  matrix.SetDims(3, 3);
  matrix[0][0] = 1;
  matrix[0][1] = 2;
  matrix[0][2] = 3;
  matrix[1][0] = 0;
  matrix[1][1] = 4;
  matrix[1][2] = 5;
  matrix[2][0] = 1;
  matrix[2][1] = 0;
  matrix[2][2] = 6;
  ZZ matrix_det;
  determinant(matrix_det, matrix);

  long lattice_rank = 0;
  ZZ lattice_det;
  long extension_factors = 0;
  long interpolated_value = 0;
  long derivative_value = 0;

  const std::string expected =
      "1606938044258990275541962092341162602522202993782792835301376";
  const bool ok_integer = n_out.str() == expected;
  const bool ok_polynomial =
      coeff(square, 0) == 1 && coeff(square, 1) == 4 &&
      coeff(square, 2) == 6 && coeff(square, 3) == 4 && coeff(square, 4) == 1;
  const bool ok_factorization = factors.length() == 2;
  const bool ok_binary_product =
      deg(binary_product) == 6 && coeff(binary_product, 0) == 1 &&
      coeff(binary_product, 1) == 0 && coeff(binary_product, 2) == 0 &&
      coeff(binary_product, 3) == 1 && coeff(binary_product, 4) == 1 &&
      coeff(binary_product, 5) == 1 && coeff(binary_product, 6) == 1;
  const bool ok_binary_factorization = binary_factors.length() == 2;
  const bool ok_matrix_det = matrix_det == 22;
  const bool ok_lattice = check_lattice_reduction(lattice_rank, lattice_det);
  const bool ok_extension = check_extension_field(extension_factors);
  const bool ok_interpolation =
      check_modular_interpolation(interpolated_value, derivative_value);

  if (ok_integer && ok_polynomial && ok_factorization && ok_binary_product &&
      ok_binary_factorization && ok_matrix_det && ok_lattice && ok_extension &&
      ok_interpolation) {
    std::cout << "ntl-ok integer=2^200 polynomial=(x+1)^4 mod-factors="
              << factors.length() << " gf2x-factors="
              << binary_factors.length() << " matrix-det=" << matrix_det
              << " lll-rank=" << lattice_rank
              << " lll-det-square=" << lattice_det
              << " gf2e-factors=" << extension_factors
              << " zz_p-interpolate=" << interpolated_value
              << " derivative=" << derivative_value
              << "\n";
    return 0;
  }
  std::cerr << "ntl smoke failure:"
            << " integer=" << ok_integer
            << " polynomial=" << ok_polynomial
            << " mod-factorization=" << ok_factorization
            << " gf2x-product=" << ok_binary_product
            << " gf2x-factorization=" << ok_binary_factorization
            << " matrix-det=" << ok_matrix_det
            << " lattice=" << ok_lattice
            << " extension-field=" << ok_extension
            << " interpolation=" << ok_interpolation
            << " lll-rank=" << lattice_rank
            << " lll-det-square=" << lattice_det
            << " gf2e-factors=" << extension_factors
            << " zz_p-interpolate=" << interpolated_value
            << " derivative=" << derivative_value
            << "\n";
  return 1;
}
