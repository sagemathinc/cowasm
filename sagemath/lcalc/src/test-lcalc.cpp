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

  int coeff_l4[] = {0, 1, 0, -1, 0};
  Double gamma_l4[] = {0, 0.5};
  Complex lambda_l4[] = {0, 0.5};
  L_function<int> l4("L4", 1, 4, coeff_l4, 4, sqrt(4 / Pi), 1, 1,
                     gamma_l4, lambda_l4);
  Complex l4_partial = l4.dirichlet_series(Complex(2.0, 0.0), 1000);
  double l4_expected = 0.0;
  for (int n = 1; n <= 1000; n++) {
    int index = n % 4;
    if (index == 0) {
      index = 4;
    }
    l4_expected += static_cast<double>(coeff_l4[index]) / (n * n);
  }
  if (!close_to(real(l4_partial), l4_expected, 1e-12)) {
    return 7;
  }
  if (!close_to(imag(l4_partial), 0.0, 1e-15)) {
    return 8;
  }

  Complex coeff_l5[] = {0, 1, I, -I, -1, 0};
  Complex gauss_sum = 0;
  for (int n = 1; n <= 4; n++) {
    gauss_sum += coeff_l5[n] * exp(n * 2 * I * Pi / 5);
  }
  L_function<Complex> l5("L5", 1, 5, coeff_l5, 5, sqrt(5 / Pi),
                         gauss_sum / (I * sqrt(5.0)), 1, gamma_l4,
                         lambda_l4);
  Complex l5_partial = l5.dirichlet_series(Complex(2.0, 0.0), 1000);
  Complex l5_expected = 0.0;
  for (int n = 1; n <= 1000; n++) {
    int index = n % 5;
    if (index == 0) {
      index = 5;
    }
    l5_expected += coeff_l5[index] / static_cast<double>(n * n);
  }
  if (!close_to(real(l5_partial), real(l5_expected), 1e-12)) {
    return 9;
  }
  if (!close_to(imag(l5_partial), imag(l5_expected), 1e-12)) {
    return 10;
  }

  if (gcd(462, 1071) != 21) {
    return 11;
  }
  if (nextprime(1000) != 1009) {
    return 12;
  }
  if (!isprime(1009) || isprime(1024)) {
    return 13;
  }
  if (power_mod_q(7, 128, 101) != 97) {
    return 14;
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
    return 15;
  }

  std::cout << std::setprecision(10)
            << "lcalc-ok zeta-real=" << real_part
            << " zeta-imag=" << imag_part
            << " zeta2-partial=" << real(zeta_2_partial)
            << " zeta2-tail=" << real(zeta_tail)
            << " dirichlet=l4,l5"
            << " gcd=21 nextprime=1009 powmod=97"
            << std::setprecision(12)
            << " elliptic=" << elliptic_value << "\n";
  return 0;
}
