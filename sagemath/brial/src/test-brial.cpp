#include <polybori.h>
#include <polybori/groebner/groebner_alg.h>

#include <iostream>
#include <vector>

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

  GroebnerStrategy strategy(ring);
  strategy.addGeneratorDelayed(x + y);
  strategy.addGeneratorDelayed(y + BoolePolynomial(true, ring));
  strategy.symmGB_F2();
  std::vector<BoolePolynomial> basis = strategy.minimalizeAndTailReduce();

  BoolePolynomial x_normal = strategy.nf(x);
  BoolePolynomial y_normal = strategy.nf(y);
  if (x_normal != BoolePolynomial(true, ring) ||
      y_normal != BoolePolynomial(true, ring)) {
    std::cerr << "unexpected Groebner normal forms: x=" << x_normal
              << " y=" << y_normal << std::endl;
    return 1;
  }

  std::cout << "brial-ok product=" << product
            << " reduced=" << reduced
            << " groebner-basis=" << basis.size()
            << " nf(x)=" << x_normal
            << " terms=" << product.length() << std::endl;
  return 0;
}
