#include <eclib/curve.h>
#include <eclib/points.h>

#include <iostream>
#include <vector>

int main() {
  set_precision(80);
  initprimes("PRIMES", 0);

  Curve curve(0, -1, 1, -10, -20);
  Curvedata minimal(curve, 1);
  CurveRed reduced(minimal);
  bigint conductor = getconductor(reduced);

  std::vector<Point> torsion = torsion_points(minimal);

  Curve point_curve(0, 0, 1, -7, 6);
  Curvedata point_data(point_curve, 1);
  Point p0(point_data, bigint(0), bigint(2));
  Point p1(point_data, bigint(1), bigint(0));
  Point sum = p0 + p1;
  Point triple = 3 * p0;

  if (conductor != bigint(11) || torsion.size() != 5 || !p0.isvalid() ||
      !p1.isvalid() || !sum.isvalid() || !triple.isvalid()) {
    std::cerr << "unexpected eclib result: conductor=" << conductor
              << " torsion=" << torsion.size() << " p0=" << p0.isvalid()
              << " p1=" << p1.isvalid() << " sum=" << sum.isvalid()
              << " triple=" << triple.isvalid() << "\n";
    return 1;
  }

  std::cout << "eclib-ok conductor=" << conductor
            << " torsion=" << torsion.size()
            << " point-arithmetic=valid\n";
  return 0;
}
