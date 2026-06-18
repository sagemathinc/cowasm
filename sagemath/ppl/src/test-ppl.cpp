#include <ppl.hh>

#include <iostream>

using namespace Parma_Polyhedra_Library;

int main() {
  Variable x(0);
  Variable y(1);

  C_Polyhedron polyhedron(2);
  polyhedron.add_constraint(x >= 0);
  polyhedron.add_constraint(y >= 0);
  polyhedron.add_constraint(x <= 4);
  polyhedron.add_constraint(x + y <= 7);

  Coefficient max_num;
  Coefficient max_den;
  bool maximum = false;
  Generator maximizing_point(point());
  bool bounded = polyhedron.maximize(3 * x + 2 * y, max_num, max_den,
                                     maximum, maximizing_point);

  Constraint_System constraints;
  constraints.insert(x >= 0);
  constraints.insert(y >= 0);
  constraints.insert(x <= 4);
  constraints.insert(y <= 5);
  constraints.insert(2 * x + y <= 9);

  MIP_Problem mip(2, constraints, 5 * x + 3 * y, MAXIMIZATION);
  MIP_Problem_Status status = mip.solve();
  Coefficient mip_num;
  Coefficient mip_den;
  mip.optimal_value(mip_num, mip_den);

  C_Polyhedron hull(2, EMPTY);
  hull.add_generator(point(0 * x + 0 * y));
  hull.add_generator(point(4 * x + 0 * y));
  hull.add_generator(point(4 * x + 3 * y));
  hull.add_generator(point(0 * x + 7 * y));
  bool hull_contains = hull.contains(polyhedron);

  bool ok = bounded && maximum && max_num == 18 && max_den == 1;
  ok = ok && status == OPTIMIZED_MIP_PROBLEM && mip_num == 25 && mip_den == 1;
  ok = ok && hull_contains && polyhedron.bounds_from_below(x + y);

  if (ok) {
    std::cout << "ppl-ok poly-max=" << max_num << "/" << max_den
              << " mip-max=" << mip_num << "/" << mip_den
              << " hull=contains" << std::endl;
  }

  return ok ? 0 : 1;
}
