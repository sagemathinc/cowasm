#include <fplll/fplll.h>

#include <iostream>

int main() {
  fplll::ZZ_mat<mpz_t> basis(3, 3);
  basis[0][0] = 105;
  basis[0][1] = 821;
  basis[0][2] = 17;
  basis[1][0] = 4;
  basis[1][1] = 34;
  basis[1][2] = 9;
  basis[2][0] = 29;
  basis[2][1] = 8;
  basis[2][2] = 77;

  int status = fplll::lll_reduction(basis);
  if (status != fplll::RED_SUCCESS) {
    std::cerr << "lll_reduction failed: "
              << fplll::get_red_status_str(status) << "\n";
    return 1;
  }

  fplll::ZZ_mat<mpz_t> transform;
  fplll::ZZ_mat<mpz_t> inverse_transform;
  fplll::MatGSO<fplll::Z_NR<mpz_t>, fplll::FP_NR<mpfr_t>> gso(
      basis, transform, inverse_transform, 0);
  if (!fplll::is_lll_reduced<fplll::Z_NR<mpz_t>, fplll::FP_NR<mpfr_t>>(
          gso, fplll::LLL_DEF_DELTA, fplll::LLL_DEF_ETA)) {
    std::cerr << "output basis is not LLL reduced\n";
    return 1;
  }

  std::cout << "fplll-ok first-vector=" << basis[0][0] << "," << basis[0][1]
            << "," << basis[0][2] << "\n";
  return 0;
}
