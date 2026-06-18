#include <iostream>
#include <vector>

#include <libnormaliz/libnormaliz.h>

int main() {
  using Integer = long long;

  std::vector<std::vector<Integer>> generators{{1, 0}, {0, 1}};
  libnormaliz::Cone<Integer> cone(libnormaliz::Type::cone, generators);
  cone.compute(libnormaliz::ConeProperty::HilbertBasis);

  const auto& hilbert = cone.getHilbertBasisMatrix();
  std::cout << "normaliz-lib-ok rows=" << hilbert.nr_of_rows()
            << " cols=" << hilbert.nr_of_columns() << "\n";

  if (hilbert.nr_of_rows() != 2 || hilbert.nr_of_columns() != 2) {
    return 1;
  }
  return 0;
}
