#include <bliss/bliss_C.h>

#include <math.h>
#include <stdio.h>

static void add_cycle_edges(BlissGraph *graph, const unsigned int *vertices) {
  bliss_add_edge(graph, vertices[0], vertices[1]);
  bliss_add_edge(graph, vertices[1], vertices[2]);
  bliss_add_edge(graph, vertices[2], vertices[3]);
  bliss_add_edge(graph, vertices[3], vertices[0]);
}

static void count_generator(void *user_param, unsigned int n,
                            const unsigned int *automorphism) {
  unsigned int *count = (unsigned int *)user_param;
  unsigned int moves_vertex = 0;

  for (unsigned int i = 0; i < n; i++) {
    moves_vertex |= automorphism[i] != i;
  }

  if (moves_vertex) {
    ++*count;
  }
}

int main(void) {
  BlissGraph *cycle = bliss_new(4);
  BlissGraph *relabeled = bliss_new(4);
  unsigned int cycle_vertices[] = {0, 1, 2, 3};
  unsigned int relabeled_vertices[] = {2, 0, 3, 1};
  unsigned int generator_count = 0;
  BlissStats stats = {0};

  add_cycle_edges(cycle, cycle_vertices);
  add_cycle_edges(relabeled, relabeled_vertices);

  bliss_find_automorphisms(cycle, count_generator, &generator_count, &stats);
  if (fabsl(stats.group_size_approx - 8.0L) > 0.01L || generator_count == 0) {
    fprintf(stderr,
            "unexpected C4 automorphism data: group=%.0f generators=%u\n",
            (double)stats.group_size_approx, generator_count);
    return 1;
  }

  const unsigned int *cycle_label =
      bliss_find_canonical_labeling(cycle, NULL, NULL, NULL);
  BlissGraph *cycle_canonical = bliss_permute(cycle, cycle_label);
  const unsigned int *relabeled_label =
      bliss_find_canonical_labeling(relabeled, NULL, NULL, NULL);
  BlissGraph *relabeled_canonical = bliss_permute(relabeled, relabeled_label);

  int canonical_cmp = bliss_cmp(cycle_canonical, relabeled_canonical);

  bliss_release(cycle_canonical);
  bliss_release(relabeled_canonical);
  bliss_release(cycle);
  bliss_release(relabeled);

  if (canonical_cmp != 0) {
    fprintf(stderr, "canonical labels differ for isomorphic C4 graphs\n");
    return 1;
  }

  printf("bliss-ok c4-group=%.0f generators=%u canonical-cmp=%d\n",
         (double)stats.group_size_approx, generator_count, canonical_cmp);
  return 0;
}
