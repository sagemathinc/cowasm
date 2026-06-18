#include <modular_decomposition.h>

#include <stdio.h>
#include <stdlib.h>

static void add_edge(graphe *graph, int u, int v) {
  adj *edge = (adj *)malloc(sizeof(adj));
  edge->s = v;
  edge->suiv = graph->G[u];
  graph->G[u] = edge;

  edge = (adj *)malloc(sizeof(adj));
  edge->s = u;
  edge->suiv = graph->G[v];
  graph->G[v] = edge;
}

static graphe new_graph(int n) {
  graphe graph;
  graph.n = n;
  graph.G = (adj **)calloc((size_t)n, sizeof(adj *));
  return graph;
}

static void free_graph(graphe *graph) {
  for (int i = 0; i < graph->n; i++) {
    adj *edge = graph->G[i];
    while (edge != NULL) {
      adj *next = edge->suiv;
      free(edge);
      edge = next;
    }
  }
  free(graph->G);
}

static int child_count(noeud *root) {
  int count = 0;
  for (fils *child = root->fils; child != NULL; child = child->suiv) {
    count++;
  }
  return count;
}

static int check_empty4(void) {
  graphe graph = new_graph(4);
  noeud *root = decomposition_modulaire(graph);
  int ok = root != NULL && root->type == PARALLELE && child_count(root) == 4;
  free_graph(&graph);
  return ok;
}

static int check_complete4(void) {
  graphe graph = new_graph(4);
  for (int u = 0; u < 4; u++) {
    for (int v = u + 1; v < 4; v++) {
      add_edge(&graph, u, v);
    }
  }

  noeud *root = decomposition_modulaire(graph);
  int ok = root != NULL && root->type == SERIE && child_count(root) == 4;
  free_graph(&graph);
  return ok;
}

static int check_path4(void) {
  graphe graph = new_graph(4);
  add_edge(&graph, 0, 1);
  add_edge(&graph, 1, 2);
  add_edge(&graph, 2, 3);

  noeud *root = decomposition_modulaire(graph);
  int ok = root != NULL && root->type == PREMIER && child_count(root) == 4;
  free_graph(&graph);
  return ok;
}

int main(void) {
  int empty_ok = check_empty4();
  int complete_ok = check_complete4();
  int path_ok = check_path4();

  if (empty_ok && complete_ok && path_ok) {
    puts("modular-decomposition-ok empty=parallel complete=series path=prime");
  }

  return empty_ok && complete_ok && path_ok ? 0 : 1;
}
