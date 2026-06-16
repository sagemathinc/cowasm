#include <NTL/GF2X.h>
#include <NTL/GF2XFactoring.h>
#include <NTL/ZZ.h>
#include <NTL/ZZX.h>
#include <NTL/ZZ_p.h>
#include <NTL/ZZ_pX.h>
#include <NTL/ZZ_pXFactoring.h>
#include <NTL/config.h>

#ifndef NTL_GF2X_LIB
#error "NTL was not configured with GF2X support"
#endif

#include <iostream>
#include <sstream>
#include <string>

using namespace NTL;

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

  if (ok_integer && ok_polynomial && ok_factorization && ok_binary_product &&
      ok_binary_factorization) {
    std::cout << "ntl-ok gf2x factors=" << binary_factors.length() << "\n";
    return 0;
  }
  return 1;
}
