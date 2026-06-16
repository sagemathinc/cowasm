#include <treedec/misc.hpp>
#include <treedec/thorup.hpp>

#include <cassert>
#include <iostream>

using Graph = boost::adjacency_list<boost::vecS, boost::vecS, boost::undirectedS>;
using TreeDecomposition = treedec::graph_traits<Graph>::treedec_type;
using Thorup = treedec::thorup<Graph>;

int main() {
  constexpr unsigned cycle_vertices = 16;
  Graph cycle(cycle_vertices);

  for (unsigned i = 0; i < cycle_vertices; i++) {
    boost::add_edge(i, (i + 1) % cycle_vertices, cycle);
  }

  const Graph &const_cycle = cycle;
  Thorup algorithm(const_cycle);
  algorithm.do_it();

  TreeDecomposition decomposition;
  algorithm.get_tree_decomposition(decomposition);

  assert(treedec::is_valid_treedecomposition(cycle, decomposition));
  const auto width = treedec::get_width(decomposition);
  assert(width == 2);

  std::cout << "tdlib-ok cycle-width=" << width << " valid=1\n";
  return 0;
}
