#include <polybori.h>
#include <polybori/groebner/groebner_alg.h>

#include <iostream>

USING_NAMESPACE_PBORI
USING_NAMESPACE_PBORIGB

int main() {
  BoolePolyRing ring(8, BoolePolyRing::lp);
  ring.setVariableName(0, "x");
  ring.setVariableName(1, "y");
  ring.setVariableName(2, "z");

  BooleVariable x(0, ring);
  BooleVariable y(1, ring);
  BooleVariable z(2, ring);

  BoolePolynomial product = (x + y) * (x + z);
  BoolePolynomial expected = x + x * z + x * y + y * z;
  if (product != expected) {
    std::cerr << "unexpected product: " << product << std::endl;
    return 1;
  }

  BoolePolynomial reduced = reduce_by_monom(product, x);
  if (reduced != y * z) {
    std::cerr << "unexpected monomial reduction: " << reduced << std::endl;
    return 1;
  }

  std::cout << "brial-ok product=" << product
            << " reduced=" << reduced
            << " terms=" << product.length() << std::endl;
  return 0;
}
