#include <gmpxx.h>

#include <iostream>
#include <string>

int main() {
  mpz_class n = 1;
  for (int i = 0; i < 200; i++) {
    n *= 2;
  }

  mpz_class gcd_value;
  mpz_gcd_ui(gcd_value.get_mpz_t(), n.get_mpz_t(), 63);

  mpz_class inverse_base = 17;
  mpz_class inverse_modulus = 3120;
  mpz_class inverse;
  mpz_invert(inverse.get_mpz_t(), inverse_base.get_mpz_t(),
             inverse_modulus.get_mpz_t());

  mpz_class residue;
  mpz_class powm_base = 4;
  mpz_class powm_modulus = 497;
  mpz_powm_ui(residue.get_mpz_t(), powm_base.get_mpz_t(), 13,
              powm_modulus.get_mpz_t());

  mpq_class rational = mpq_class(1, 3) + mpq_class(1, 6);

  const std::string expected =
      "1606938044258990275541962092341162602522202993782792835301376";
  if (n.get_str() != expected || rational.get_str() != "1/2" ||
      gcd_value != 1 || inverse != 2753 || residue != 445) {
    return 1;
  }

  std::cout << "gmpxx-ok integer=2^200 rational=" << rational
            << " gcd=1 inverse=2753 powm=445\n";
  return 0;
}
