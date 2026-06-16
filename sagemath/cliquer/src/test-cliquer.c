#include <stdio.h>
#include <stdlib.h>

#include <cliquer/cliquer.h>

static int contains(set_t set, int vertex) {
  return SET_CONTAINS(set, vertex) ? 1 : 0;
}

int main(void) {
  graph_t *graph = graph_new(5);
  set_t clique;
  int max_size;

  if (!graph) {
    return 1;
  }

  GRAPH_ADD_EDGE(graph, 0, 1);
  GRAPH_ADD_EDGE(graph, 0, 2);
  GRAPH_ADD_EDGE(graph, 1, 2);
  GRAPH_ADD_EDGE(graph, 2, 3);
  GRAPH_ADD_EDGE(graph, 3, 4);

  clique_default_options->time_function = NULL;
  max_size = clique_unweighted_max_size(graph, clique_default_options);
  clique = clique_unweighted_find_single(graph, 0, 0, TRUE, clique_default_options);

  if (max_size != 3 || !clique || set_size(clique) != 3 ||
      !contains(clique, 0) || !contains(clique, 1) || !contains(clique, 2)) {
    fprintf(stderr, "unexpected clique result: max=%d size=%d\n", max_size,
            clique ? set_size(clique) : -1);
    graph_free(graph);
    if (clique) {
      set_free(clique);
    }
    return 1;
  }

  printf("cliquer-ok max=%d clique=%d%d%d edges=%d\n", max_size,
         contains(clique, 0), contains(clique, 1), contains(clique, 2),
         graph_edge_count(graph));

  set_free(clique);
  graph_free(graph);
  return 0;
}
