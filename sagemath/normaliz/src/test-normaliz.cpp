#include <iostream>
#include <vector>

#include <libnormaliz/libnormaliz.h>

template <typename Integer>
static bool has_row(const libnormaliz::Matrix<Integer>& matrix,
                    const std::vector<Integer>& expected) {
  for (size_t row = 0; row < matrix.nr_of_rows(); row++) {
    if (matrix[row] == expected) {
      return true;
    }
  }
  return false;
}

int main() {
  using Integer = long long;

  std::vector<std::vector<Integer>> generators{{1, 0}, {0, 1}};
  libnormaliz::Cone<Integer> cone(libnormaliz::Type::cone, generators);
  cone.compute(libnormaliz::ConeProperty::HilbertBasis,
               libnormaliz::ConeProperty::SupportHyperplanes,
               libnormaliz::ConeProperty::Multiplicity);

  const auto& hilbert = cone.getHilbertBasisMatrix();
  const auto& support = cone.getSupportHyperplanesMatrix();
  const auto& rays = cone.getExtremeRaysMatrix();
  const auto multiplicity = cone.getMultiplicity();
  const auto rank = cone.getRank();

  bool ok = hilbert.nr_of_rows() == 2 && hilbert.nr_of_columns() == 2 &&
            has_row(hilbert, {1, 0}) && has_row(hilbert, {0, 1});
  ok = ok && support.nr_of_rows() == 2 && support.nr_of_columns() == 2 &&
       has_row(support, {1, 0}) && has_row(support, {0, 1});
  ok = ok && rays.nr_of_rows() == 2 && rays.nr_of_columns() == 2 &&
       has_row(rays, {1, 0}) && has_row(rays, {0, 1});
  ok = ok && rank == 2 && cone.getEmbeddingDim() == 2 && multiplicity == 1;

  if (!ok) {
    std::cerr << "unexpected Normaliz cone result: hilbert="
              << hilbert.nr_of_rows() << "x" << hilbert.nr_of_columns()
              << " support=" << support.nr_of_rows() << "x"
              << support.nr_of_columns() << " rays=" << rays.nr_of_rows()
              << "x" << rays.nr_of_columns() << " rank=" << rank
              << " multiplicity=" << multiplicity << "\n";
    return 1;
  }

  std::cout << "normaliz-lib-ok hilbert=" << hilbert.nr_of_rows()
            << " support=" << support.nr_of_rows() << " rays="
            << rays.nr_of_rows() << " rank=" << rank
            << " multiplicity=" << multiplicity << "\n";
  return 0;
}
