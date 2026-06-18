#include <fflas-ffpack/fflas-ffpack.h>

#include <cstddef>
#include <cstdint>
#include <iostream>

int main() {
  Givaro::Modular<int64_t> field(17);

  int64_t a[4] = {1, 2, 3, 4};
  int64_t b[4] = {5, 6, 7, 8};
  int64_t c[4] = {0, 0, 0, 0};

  FFLAS::fgemm(field, FFLAS::FflasNoTrans, FFLAS::FflasNoTrans, 2, 2, 2,
               field.one, a, 2, b, 2, field.zero, c, 2);

  int64_t rank_matrix[6] = {1, 2, 3, 2, 4, 6};
  std::size_t rank = FFPACK::Rank(field, 2, 3, rank_matrix, 3);

  int64_t det_matrix[4] = {1, 2, 3, 4};
  int64_t det = 0;
  FFPACK::Det(field, det, 2, det_matrix, 2);

  int state = 0;
  int64_t solve_matrix[4] = {1, 2, 3, 4};
  int64_t rhs_and_solution[4] = {5, 7, 6, 8};
  std::size_t solve_rank =
      FFPACK::fgesv(field, FFLAS::FflasLeft, 2, 2, solve_matrix, 2,
                    rhs_and_solution, 2, &state);

  const bool ok_product = c[0] == 2 && c[1] == 5 && c[2] == 9 && c[3] == 16;
  const bool ok_rank = rank == 1;
  const bool ok_det = det == 15;
  const bool ok_solve = state == 0 && solve_rank == 2 &&
                        rhs_and_solution[0] == 13 &&
                        rhs_and_solution[1] == 11 &&
                        rhs_and_solution[2] == 13 &&
                        rhs_and_solution[3] == 15;

  if (!ok_product || !ok_rank || !ok_det || !ok_solve) {
    std::cerr << "unexpected product=(" << c[0] << "," << c[1] << ","
              << c[2] << "," << c[3] << ") rank=" << rank
              << " det=" << det << " solve-state=" << state
              << " solve-rank=" << solve_rank << " solve=("
              << rhs_and_solution[0] << "," << rhs_and_solution[1] << ","
              << rhs_and_solution[2] << "," << rhs_and_solution[3] << ")\n";
    return 1;
  }

  std::cout << "fflas-ffpack-ok product=2,5,9,16 rank=1 det=15 "
               "solve=13,11,13,15\n";
  return 0;
}
