#include "lcalc/L.h"

#include <cmath>
#include <iomanip>
#include <iostream>

int main() {
  initialize_globals();

  L_function<int> zeta;
  Complex value = zeta.value(Complex(0.5, 100.0));
  double real_part = real(value);
  double imag_part = imag(value);

  if (std::abs(real_part - 2.692619885681324) > 1e-9) {
    return 1;
  }
  if (std::abs(imag_part + 0.02038602960259816) > 1e-9) {
    return 2;
  }

  std::cout << std::setprecision(10)
            << "lcalc-ok zeta-real=" << real_part
            << " zeta-imag=" << imag_part << "\n";
  return 0;
}
