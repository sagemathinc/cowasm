#include <givaro/extension.h>
#include <givaro/givinteger.h>
#include <givaro/givrational.h>
#include <givaro/modular.h>

#include <iostream>
#include <sstream>
#include <string>

using Givaro::Integer;
using Givaro::Modular;
using Givaro::Rational;

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

  std::ostringstream factorial_out;
  factorial_out << factorial;
  std::ostringstream rational_out;
  rational_out << two_thirds;

  const bool ok_factorial =
      factorial_out.str() == "265252859812191058636308480000000";
  const bool ok_rational = two_thirds == four_sixths;
  const bool ok_field = field.areEqual(z, field.one);

  if (!ok_factorial || !ok_rational || !ok_field) {
    return 1;
  }

  std::cout << "givaro-ok factorial=" << factorial_out.str()
            << " rational=" << rational_out.str() << " mod17=1\n";
  return 0;
}
