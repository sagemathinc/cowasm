#include <fplll/fplll.h>

#include <iostream>
#include <vector>

namespace {

long squared_norm(const std::vector<fplll::Z_NR<mpz_t>> &v) {
  long norm = 0;
  for (const auto &entry : v) {
    const long value = entry.get_si();
    norm += value * value;
  }
  return norm;
}

bool equals_vector(const std::vector<fplll::Z_NR<mpz_t>> &v,
                   const long expected[]) {
  for (std::size_t i = 0; i < v.size(); i++) {
    if (v[i].get_si() != expected[i]) {
      return false;
    }
  }
  return true;
}

bool first_row_equals(const fplll::ZZ_mat<mpz_t> &basis,
                      const long expected[]) {
  for (int i = 0; i < basis.get_cols(); i++) {
    if (basis[0][i].get_si() != expected[i]) {
      return false;
    }
  }
  return true;
}

}  // namespace

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
  fplll::ZZ_mat<mpz_t> bkz_basis = basis;

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

  std::vector<fplll::Z_NR<mpz_t>> svp_coords;
  status = fplll::shortest_vector(basis, svp_coords, fplll::SVPM_PROVED,
                                  fplll::SVP_DEFAULT);
  if (status != fplll::RED_SUCCESS) {
    std::cerr << "shortest_vector failed: "
              << fplll::get_red_status_str(status) << "\n";
    return 1;
  }

  std::vector<fplll::Z_NR<mpz_t>> svp_vector;
  fplll::vector_matrix_product(svp_vector, svp_coords, basis);
  if (svp_vector.size() != 3 || squared_norm(svp_vector) != 1253) {
    std::cerr << "unexpected SVP vector norm: " << squared_norm(svp_vector)
              << "\n";
    return 1;
  }

  std::vector<fplll::Z_NR<mpz_t>> target(3);
  target[0] = 5;
  target[1] = 35;
  target[2] = 10;

  std::vector<fplll::Z_NR<mpz_t>> cvp_coords;
  status = fplll::closest_vector(basis, target, cvp_coords, fplll::CVPM_PROVED);
  if (status != fplll::RED_SUCCESS) {
    std::cerr << "closest_vector failed: "
              << fplll::get_red_status_str(status) << "\n";
    return 1;
  }

  std::vector<fplll::Z_NR<mpz_t>> cvp_vector;
  fplll::vector_matrix_product(cvp_vector, cvp_coords, basis);
  const long expected_cvp[] = {4, 34, 9};
  if (cvp_vector.size() != 3 || !equals_vector(cvp_vector, expected_cvp)) {
    std::cerr << "unexpected CVP vector\n";
    return 1;
  }

  fplll::ZZ_mat<mpz_t> bkz_transform;
  std::vector<fplll::Strategy> bkz_strategies;
  fplll::BKZParam bkz_params(3, bkz_strategies, fplll::LLL_DEF_DELTA,
                             fplll::BKZ_MAX_LOOPS, 1);
  status = fplll::bkz_reduction(&bkz_basis, &bkz_transform, bkz_params,
                                fplll::FT_MPFR, 64);
  if (status != fplll::RED_SUCCESS &&
      status != fplll::RED_BKZ_LOOPS_LIMIT) {
    std::cerr << "bkz_reduction failed: "
              << fplll::get_red_status_str(status) << "\n";
    return 1;
  }

  fplll::ZZ_mat<mpz_t> bkz_inverse_transform;
  fplll::MatGSO<fplll::Z_NR<mpz_t>, fplll::FP_NR<mpfr_t>> bkz_gso(
      bkz_basis, bkz_transform, bkz_inverse_transform, 0);
  if (!fplll::is_lll_reduced<fplll::Z_NR<mpz_t>, fplll::FP_NR<mpfr_t>>(
          bkz_gso, fplll::LLL_DEF_DELTA, fplll::LLL_DEF_ETA)) {
    std::cerr << "BKZ output basis is not LLL reduced\n";
    return 1;
  }

  const long expected_bkz_first[] = {4, 34, 9};
  if (bkz_basis.get_cols() != 3 ||
      !first_row_equals(bkz_basis, expected_bkz_first)) {
    std::cerr << "unexpected BKZ first vector\n";
    return 1;
  }

  std::cout << "fplll-ok first-vector=" << basis[0][0] << "," << basis[0][1]
            << "," << basis[0][2] << " svp-norm=" << squared_norm(svp_vector)
            << " cvp-vector=" << cvp_vector[0] << "," << cvp_vector[1] << ","
            << cvp_vector[2] << " bkz-first=" << bkz_basis[0][0] << ","
            << bkz_basis[0][1] << "," << bkz_basis[0][2] << "\n";
  return 0;
}
