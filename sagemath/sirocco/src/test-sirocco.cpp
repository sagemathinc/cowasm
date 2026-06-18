#include <cmath>
#include <cstdio>
#include <cstdlib>

#include <mpfr.h>
#include <sirocco.h>

static void require(bool condition, const char *message) {
  if (!condition) {
    std::fprintf(stderr, "sirocco-test failed: %s\n", message);
    std::exit(1);
  }
}

int main() {
  mpfr_set_default_prec(162);

  double coeffs[] = {
      -2.0, -2.0, 0.0, 0.0,
      0.0, 0.0, 0.0, -0.0,
      0.0, 0.0, 0.0, 0.0,
      1.0, 1.0, 0.0, -0.0,
      0.0, 0.0, 0.0, 0.0,
      1.0, 1.0, 0.0, 0.0,
  };

  double other_coeffs[] = {
      -2.1, -2.1, 0.0, 0.0,
      0.0, 0.0, 0.0, -0.0,
      0.0, 0.0, 0.0, 0.0,
      1.0, 1.0, 0.0, -0.0,
      0.0, 0.0, 0.0, 0.0,
      1.0, 1.0, 0.0, 0.0,
  };

  int component_degrees[] = {2};
  const double y0_real = 1.414;
  const double y0_imag = 0.0;

  double *path = homotopyPath(2, coeffs, y0_real, y0_imag);
  require(path != nullptr, "homotopyPath returned null");
  int path_len = static_cast<int>(path[0]);
  require(path_len >= 2, "homotopyPath returned too few points");
  require(std::fabs(path[1]) < 1e-12, "homotopyPath did not start at x=0");
  require(std::fabs(path[3]) < 1e-12, "homotopyPath start root is not real");
  delete[] path;

  double *component_path =
      homotopyPath_comps(2, coeffs, y0_real, y0_imag, 1, component_degrees,
                         other_coeffs);
  require(component_path != nullptr, "homotopyPath_comps returned null");
  int component_path_len = static_cast<int>(component_path[0]);
  require(component_path_len >= 2, "homotopyPath_comps returned too few points");
  delete[] component_path;

  mpfr_t mp_coeffs[24];
  mpfr_t mp_other_coeffs[24];
  for (int i = 0; i < 24; ++i) {
    mpfr_init_set_d(mp_coeffs[i], coeffs[i], (i % 2) ? MPFR_RNDU : MPFR_RNDD);
    mpfr_init_set_d(mp_other_coeffs[i], other_coeffs[i],
                    (i % 2) ? MPFR_RNDU : MPFR_RNDD);
  }

  mpfr_t mp_y0_real;
  mpfr_t mp_y0_imag;
  mpfr_init_set_d(mp_y0_real, y0_real, MPFR_RNDN);
  mpfr_init_set_d(mp_y0_imag, y0_imag, MPFR_RNDN);

  mpfr_t *mp_path = homotopyPath_mp(2, mp_coeffs, mp_y0_real, mp_y0_imag, 106);
  require(mp_path != nullptr, "homotopyPath_mp returned null");
  int mp_path_len = mpfr_get_si(mp_path[0], MPFR_RNDN);
  require(mp_path_len >= 2, "homotopyPath_mp returned too few points");

  mpfr_t *mp_component_path =
      homotopyPath_mp_comps(2, mp_coeffs, mp_y0_real, mp_y0_imag, 106, 1,
                            component_degrees, mp_other_coeffs);
  require(mp_component_path != nullptr,
          "homotopyPath_mp_comps returned null");
  int mp_component_path_len = mpfr_get_si(mp_component_path[0], MPFR_RNDN);
  require(mp_component_path_len >= 2,
          "homotopyPath_mp_comps returned too few points");

  for (int i = 0; i < 3 * mp_path_len + 1; ++i) {
    mpfr_clear(mp_path[i]);
  }
  for (int i = 0; i < 3 * mp_component_path_len + 1; ++i) {
    mpfr_clear(mp_component_path[i]);
  }
  delete[] mp_path;
  delete[] mp_component_path;

  for (int i = 0; i < 24; ++i) {
    mpfr_clear(mp_coeffs[i]);
    mpfr_clear(mp_other_coeffs[i]);
  }
  mpfr_clear(mp_y0_real);
  mpfr_clear(mp_y0_imag);

  std::printf("sirocco-ok path=%d component-path=%d mp-path=%d mp-component-path=%d\n",
              path_len, component_path_len, mp_path_len, mp_component_path_len);
  return 0;
}
