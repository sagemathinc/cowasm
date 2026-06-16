#include <gmpxx.h>

#include <iostream>
#include <string>

int main() {
  mpz_class n = 1;
  for (int i = 0; i < 200; i++) {
    n *= 2;
  }

  const std::string expected =
      "1606938044258990275541962092341162602522202993782792835301376";
  std::cout << n.get_str() << "\n";
  return n.get_str() == expected ? 0 : 1;
}
