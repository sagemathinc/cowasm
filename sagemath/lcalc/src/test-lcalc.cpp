#include "lcalc/L.h"

#include <cmath>
#include <iomanip>
#include <iostream>
#include <pari/pari.h>

namespace {

bool close_to(double actual, double expected, double tolerance) {
  return std::abs(actual - expected) <= tolerance;
}

} // namespace

int main() {
  initialize_globals();

  L_function<int> zeta;
  Complex value = zeta.value(Complex(0.5, 100.0));
  double real_part = real(value);
  double imag_part = imag(value);

  if (!close_to(real_part, 2.692619885681324, 1e-9)) {
    return 1;
  }
  if (!close_to(imag_part, -0.02038602960259816, 1e-9)) {
    return 2;
  }

  Complex zeta_2_partial = zeta.dirichlet_series(Complex(2.0, 0.0), 1000);
  if (!close_to(real(zeta_2_partial), 1.6439345666815615, 1e-12)) {
    return 3;
  }
  if (!close_to(imag(zeta_2_partial), 0.0, 1e-12)) {
    return 4;
  }

  Complex zeta_tail = zeta.partial_dirichlet_series(
      Complex(2.0, 0.0), 1001, 1100);
  if (!close_to(real(zeta_tail), 0.00009082235549710733, 1e-15)) {
    return 5;
  }
  if (!close_to(imag(zeta_tail), 0.0, 1e-15)) {
    return 6;
  }

  if (gcd(462, 1071) != 21) {
    return 7;
  }
  if (nextprime(1000) != 1009) {
    return 8;
  }
  if (!isprime(1009) || isprime(1024)) {
    return 9;
  }
  if (power_mod_q(7, 128, 101) != 97) {
    return 10;
  }

  pari_init_opts(400000000, 2, INIT_DFTm);
  char a1[] = "0";
  char a2[] = "0";
  char a3[] = "0";
  char a4[] = "4";
  char a6[] = "0";
  L_function<double> curve_32a(a1, a2, a3, a4, a6, 1000);
  double elliptic_value = real(curve_32a.value(0.5));
  double elliptic_expected =
      real(GAMMA(0.5) * GAMMA(0.25) / GAMMA(0.75) / 8.0);
  if (!close_to(elliptic_value, elliptic_expected, 1e-9)) {
    return 11;
  }

  std::cout << std::setprecision(10)
            << "lcalc-ok zeta-real=" << real_part
            << " zeta-imag=" << imag_part
            << " zeta2-partial=" << real(zeta_2_partial)
            << " zeta2-tail=" << real(zeta_tail)
            << " gcd=21 nextprime=1009 powmod=97"
            << std::setprecision(12)
            << " elliptic=" << elliptic_value << "\n";
  return 0;
}
