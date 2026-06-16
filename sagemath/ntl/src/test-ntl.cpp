#include <NTL/ZZ.h>
#include <NTL/ZZX.h>
#include <NTL/ZZ_p.h>
#include <NTL/ZZ_pX.h>
#include <NTL/ZZ_pXFactoring.h>

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

  const std::string expected =
      "1606938044258990275541962092341162602522202993782792835301376";
  const bool ok_integer = n_out.str() == expected;
  const bool ok_polynomial =
      coeff(square, 0) == 1 && coeff(square, 1) == 4 &&
      coeff(square, 2) == 6 && coeff(square, 3) == 4 && coeff(square, 4) == 1;
  const bool ok_factorization = factors.length() == 2;

  if (ok_integer && ok_polynomial && ok_factorization) {
    std::cout << "ntl-ok\n";
    return 0;
  }
  return 1;
}
