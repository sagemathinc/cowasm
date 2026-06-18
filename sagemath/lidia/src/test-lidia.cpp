#include <LiDIA/bigint.h>
#include <LiDIA/bigint_matrix.h>
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

  std::cout << "lidia-ok gcd=" << g << " nextprime=" << next
            << " rational=" << rational << " mod=" << z << " det=" << det
            << "\n";
  return 0;
}
