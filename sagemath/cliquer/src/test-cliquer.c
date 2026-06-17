#include <stdio.h>
#include <stdlib.h>

#include <cliquer/cliquer.h>

static int contains(set_t set, int vertex) {
  return SET_CONTAINS(set, vertex) ? 1 : 0;
}

static void free_clique_list(set_t *cliques, int count, int capacity) {
  int limit = count < capacity ? count : capacity;
  for (int i = 0; i < limit; i++) {
    if (cliques[i]) {
      set_free(cliques[i]);
    }
  }
}

int main(void) {
  graph_t *graph = graph_new(5);
  graph_t *weighted = graph_new(4);
  set_t clique;
  set_t weighted_clique;
  set_t cliques[8] = {0};
  clique_options list_options = *clique_default_options;
  int max_size;
  int maximal_count;
  int max_weight;

  if (!graph || !weighted) {
    if (graph) {
      graph_free(graph);
    }
    if (weighted) {
      graph_free(weighted);
    }
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
  list_options.time_function = NULL;
  list_options.clique_list = cliques;
  list_options.clique_list_length = 8;
  maximal_count =
      clique_unweighted_find_all(graph, 2, 3, TRUE, &list_options);

  if (max_size != 3 || !clique || set_size(clique) != 3 ||
      !contains(clique, 0) || !contains(clique, 1) || !contains(clique, 2) ||
      maximal_count != 3) {
    fprintf(stderr, "unexpected unweighted result: max=%d size=%d all=%d\n",
            max_size, clique ? set_size(clique) : -1, maximal_count);
    graph_free(graph);
    graph_free(weighted);
    if (clique) {
      set_free(clique);
    }
    free_clique_list(cliques, maximal_count, 8);
    return 1;
  }

  GRAPH_ADD_EDGE(weighted, 0, 1);
  GRAPH_ADD_EDGE(weighted, 0, 2);
  GRAPH_ADD_EDGE(weighted, 0, 3);
  GRAPH_ADD_EDGE(weighted, 1, 2);
  weighted->weights[0] = 2;
  weighted->weights[1] = 3;
  weighted->weights[2] = 5;
  weighted->weights[3] = 9;

  max_weight = clique_max_weight(weighted, clique_default_options);
  weighted_clique =
      clique_find_single(weighted, 0, 0, TRUE, clique_default_options);

  if (max_weight != 11 || !weighted_clique || set_size(weighted_clique) != 2 ||
      !contains(weighted_clique, 0) || !contains(weighted_clique, 3)) {
    fprintf(stderr, "unexpected weighted result: weight=%d size=%d\n",
            max_weight, weighted_clique ? set_size(weighted_clique) : -1);
    graph_free(graph);
    graph_free(weighted);
    set_free(clique);
    if (weighted_clique) {
      set_free(weighted_clique);
    }
    free_clique_list(cliques, maximal_count, 8);
    return 1;
  }

  printf("cliquer-ok max=%d clique=%d%d%d all=%d weight=%d weighted=%d%d "
         "edges=%d\n",
         max_size, contains(clique, 0), contains(clique, 1),
         contains(clique, 2), maximal_count, max_weight,
         contains(weighted_clique, 0), contains(weighted_clique, 3),
         graph_edge_count(graph));

  set_free(weighted_clique);
  set_free(clique);
  free_clique_list(cliques, maximal_count, 8);
  graph_free(graph);
  graph_free(weighted);
  return 0;
}
