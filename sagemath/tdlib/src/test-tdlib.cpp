#include <treedec/misc.hpp>
#include <treedec/thorup.hpp>

#include <iostream>

using Graph = boost::adjacency_list<boost::vecS, boost::vecS, boost::undirectedS>;
using TreeDecomposition = treedec::graph_traits<Graph>::treedec_type;
using Thorup = treedec::thorup<Graph>;

static bool check_width(const char *name, const Graph &graph,
                        unsigned expected_width) {
  Thorup algorithm(graph);
  algorithm.do_it();

  TreeDecomposition decomposition;
  algorithm.get_tree_decomposition(decomposition);

  if (!treedec::is_valid_treedecomposition(graph, decomposition)) {
    std::cerr << "invalid decomposition for " << name << "\n";
    return false;
  }

  const auto width = treedec::get_width(decomposition);
  if (width != expected_width) {
    std::cerr << "unexpected width for " << name << ": got " << width
              << " expected " << expected_width << "\n";
    return false;
  }

  return true;
}

int main() {
  Graph path(6);
  for (unsigned i = 0; i + 1 < boost::num_vertices(path); i++) {
    boost::add_edge(i, i + 1, path);
  }

  constexpr unsigned cycle_vertices = 16;
  Graph cycle(cycle_vertices);
  for (unsigned i = 0; i < cycle_vertices; i++) {
    boost::add_edge(i, (i + 1) % cycle_vertices, cycle);
  }

  constexpr unsigned clique_vertices = 5;
  Graph clique(clique_vertices);
  for (unsigned i = 0; i < clique_vertices; i++) {
    for (unsigned j = i + 1; j < clique_vertices; j++) {
      boost::add_edge(i, j, clique);
    }
  }

  if (!check_width("path6", path, 1) || !check_width("cycle16", cycle, 2) ||
      !check_width("clique5", clique, 4)) {
    return 1;
  }

  std::cout << "tdlib-ok path-width=1 cycle-width=2 clique-width=4 valid=1\n";
  return 0;
}
