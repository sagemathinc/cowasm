#include <LiDIA/bigint.h>
#include <LiDIA/bigint_matrix.h>
#include <LiDIA/bigint_polynomial.h>
#include <LiDIA/bigmod.h>
#include <LiDIA/bigrational.h>

#include <iostream>

using namespace LiDIA;

int main() {
  bigint g = gcd(bigint(12345), bigint(6789));
  if (g != bigint(3)) {
    return 1;
  }

  bigint next = next_prime(bigint(1000));
  if (next != bigint(1009) || !is_prime(next) || is_prime(bigint(1024))) {
    return 2;
  }

  bigrational rational = bigrational(bigint(2), bigint(3)) +
                         bigrational(bigint(5), bigint(7));
  if (rational != bigrational(bigint(29), bigint(21))) {
    return 3;
  }

  bigmod::set_modulus(bigint(17));
  bigmod z = bigmod(5) * bigmod(3) + bigmod(4);
  if (z != bigmod(2)) {
    return 4;
  }

  bigint_matrix matrix(2, 2);
  matrix.sto(0, 0, bigint(1));
  matrix.sto(0, 1, bigint(2));
  matrix.sto(1, 0, bigint(3));
  matrix.sto(1, 1, bigint(5));
  bigint det = matrix.det();
  if (det != bigint(-1)) {
    return 5;
  }

  long f_coeffs[] = {2, -1, -2, 1};
  long g_coeffs[] = {-3, -1, 3, 1};
  polynomial< bigint > f(f_coeffs, 3);
  polynomial< bigint > h(g_coeffs, 3);
  polynomial< bigint > common = pp(gcd(f, h));
  if (common.degree() >= 0 && common[common.degree()] < bigint(0)) {
    common = -common;
  }
  if (common.degree() != 2 || common[0] != bigint(-1) ||
      common[1] != bigint(0) || common[2] != bigint(1)) {
    std::cerr << "unexpected LiDIA polynomial gcd: degree="
              << common.degree() << " coeffs=" << common[0] << ","
              << common[1] << "," << common[2] << "\n";
    return 6;
  }

  long quadratic_coeffs[] = {-5, 0, 1};
  polynomial< bigint > quadratic(quadratic_coeffs, 2);
  if (discriminant(quadratic) != bigint(20) ||
      no_of_real_roots(quadratic) != 2) {
    std::cerr << "unexpected LiDIA quadratic invariants: discriminant="
              << discriminant(quadratic)
              << " real-roots=" << no_of_real_roots(quadratic) << "\n";
    return 7;
  }

  bigint_matrix snf_matrix(2, 2);
  snf_matrix.sto(0, 0, bigint(2));
  snf_matrix.sto(0, 1, bigint(4));
  snf_matrix.sto(1, 0, bigint(6));
  snf_matrix.sto(1, 1, bigint(8));
  snf_matrix.snf_simple();
  if (snf_matrix(0, 0) != bigint(2) || snf_matrix(0, 1) != bigint(0) ||
      snf_matrix(1, 0) != bigint(0) || snf_matrix(1, 1) != bigint(4)) {
    std::cerr << "unexpected LiDIA SNF: entries=" << snf_matrix(0, 0) << ","
              << snf_matrix(0, 1) << "," << snf_matrix(1, 0) << ","
              << snf_matrix(1, 1) << "\n";
    return 8;
  }

  std::cout << "lidia-ok gcd=" << g << " nextprime=" << next
            << " rational=" << rational << " mod=" << z << " det=" << det
            << " poly-gcd=x^2-1 roots=2 snf=2,4"
            << "\n";
  return 0;
}
