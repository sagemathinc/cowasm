#include <eclib/curve.h>
#include <eclib/points.h>

#include <iostream>
#include <vector>

static bool has_entries(const std::vector<bigint> &values,
                        const std::vector<bigint> &expected) {
  if (values.size() != expected.size()) {
    return false;
  }
  for (std::size_t i = 0; i < values.size(); i++) {
    if (values[i] != expected[i]) {
      return false;
    }
  }
  return true;
}

static bool has_coordinates(const Point &p, const bigint &expected_x,
                            const bigint &expected_y,
                            const bigint &expected_z) {
  bigint x, y, z;
  p.getcoordinates(x, y, z);
  return x == expected_x && y == expected_y && z == expected_z;
}

int main() {
  set_precision(80);
  initprimes("PRIMES", 0);

  Curve curve(0, -1, 1, -10, -20);
  Curvedata minimal(curve, 1);
  CurveRed reduced(minimal);
  bigint conductor = getconductor(reduced);
  bigint p11(11);

  const bool ok_invariants =
      getdiscr(minimal) == bigint(-161051) && getc4(minimal) == bigint(496) &&
      getc6(minimal) == bigint(20008) &&
      j_invariant(minimal) == bigrational(bigint(-122023936), bigint(161051));
  const bool ok_reduction =
      has_entries(getbad_primes(reduced), {bigint(11)}) &&
      getord_p_discr(reduced, p11) == 5 && getord_p_N(reduced, p11) == 1 &&
      getord_p_j_denom(reduced, p11) == 5 && getc_p(reduced, p11) == 5 &&
      getKodaira_code(reduced, p11).code == 50 && prodcp(reduced) == bigint(5);

  std::vector<Point> torsion = torsion_points(minimal);
  bool ok_torsion = torsion.size() == 5 && ntorsion(minimal) == 5;
  for (Point p : torsion) {
    const int p_order = order(p);
    ok_torsion = ok_torsion && p.isvalid() &&
                 ((p.is_zero() && p_order == 1) ||
                  (!p.is_zero() && p_order == 5));
  }

  Curve point_curve(0, 0, 1, -7, 6);
  Curvedata point_data(point_curve, 1);
  Point p0(point_data, bigint(0), bigint(2));
  Point p1(point_data, bigint(1), bigint(0));
  Point sum = p0 + p1;
  Point twice = p0.twice();
  Point negative = -p0;
  Point infinity(point_data);
  Point zero = p0 + negative;
  Point triple = 3 * p0;

  const bool ok_sum = has_coordinates(sum, bigint(3), bigint(3), bigint(1));
  const bool ok_twice =
      has_coordinates(twice, bigint(245), bigint(-32), bigint(125));
  const bool ok_negative =
      has_coordinates(negative, bigint(0), bigint(-3), bigint(1));
  const bool ok_zero = zero.is_zero() && zero == infinity;
  const bool ok_triple = has_coordinates(
      triple, bigint(-74725), bigint(-438957), bigint(117649));

  if (conductor != bigint(11) || !ok_invariants || !ok_reduction ||
      !ok_torsion || order(p0) != -1 || order(p1) != -1 || !p0.isvalid() ||
      !p1.isvalid() || !sum.isvalid() || !twice.isvalid() ||
      !negative.isvalid() || !triple.isvalid() || !ok_sum || !ok_twice ||
      !ok_negative || !ok_zero || !ok_triple) {
    std::cerr << "unexpected eclib result: conductor=" << conductor
              << " invariants=" << ok_invariants
              << " reduction=" << ok_reduction << " torsion=" << ok_torsion
              << " p0=" << p0.isvalid() << " p1=" << p1.isvalid()
              << " sum=" << sum.isvalid() << " twice=" << twice.isvalid()
              << " negative=" << negative.isvalid()
              << " triple=" << triple.isvalid() << " ok_sum=" << ok_sum
              << " ok_twice=" << ok_twice
              << " ok_negative=" << ok_negative << " ok_zero=" << ok_zero
              << " ok_triple=" << ok_triple << "\n";
    return 1;
  }

  std::cout << "eclib-ok conductor=" << conductor
            << " torsion=" << torsion.size()
            << " reduction=checked point-arithmetic=checked\n";
  return 0;
}
