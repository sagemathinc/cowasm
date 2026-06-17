#include <rw.h>

#include <stdint.h>
#include <stdio.h>
#include <string.h>

static subset_t bit(unsigned int i) { return ((subset_t)1u) << i; }

static void clear_graph(unsigned int n) {
  memset(adjacency_matrix, 0, sizeof(*adjacency_matrix) * n);
}

static void add_edge(unsigned int i, unsigned int j) {
  adjacency_matrix[i] |= bit(j);
  adjacency_matrix[j] |= bit(i);
}

static int expect_width(const char *name, uint_fast8_t expected,
                        int expect_decomposition) {
  subset_t full_graph = 0;

  calculate_all();

  uint_fast8_t width = get_rw();
  if (expect_decomposition) {
    full_graph = (((subset_t)1u) << expect_decomposition) - 1u;
  }

  if (full_graph != 0 && cslots[full_graph] == 0) {
    fprintf(stderr, "missing %s rank-decomposition split\n", name);
    destroy_rw();
    return 0;
  }

  destroy_rw();

  if (width != expected) {
    fprintf(stderr, "unexpected %s rank-width: got %u expected %u\n", name,
            (unsigned)width, (unsigned)expected);
    return 0;
  }

  return 1;
}

static int check_empty5(void) {
  if (init_rw_dec(5) != 0) {
    fprintf(stderr, "init_rw_dec failed\n");
    return 0;
  }

  clear_graph(5);
  return expect_width("empty5", 0, 0);
}

static int check_path4(void) {
  if (init_rw_dec(4) != 0) {
    fprintf(stderr, "init_rw_dec failed\n");
    return 0;
  }

  clear_graph(4);
  add_edge(0, 1);
  add_edge(1, 2);
  add_edge(2, 3);
  return expect_width("path4", 1, 4);
}

static int check_complete5(void) {
  if (init_rw_dec(5) != 0) {
    fprintf(stderr, "init_rw_dec failed\n");
    return 0;
  }

  clear_graph(5);
  for (unsigned int i = 0; i < 5; i++) {
    for (unsigned int j = i + 1; j < 5; j++) {
      add_edge(i, j);
    }
  }
  return expect_width("complete5", 1, 5);
}

static int check_cycle5(void) {
  if (init_rw_dec(5) != 0) {
    fprintf(stderr, "init_rw_dec failed\n");
    return 0;
  }

  clear_graph(5);
  for (unsigned int i = 0; i < 5; i++) {
    add_edge(i, (i + 1) % 5);
  }
  return expect_width("cycle5", 2, 5);
}

static int check_disconnected_matching6(void) {
  if (init_rw_dec(6) != 0) {
    fprintf(stderr, "init_rw_dec failed\n");
    return 0;
  }

  clear_graph(6);
  add_edge(0, 1);
  add_edge(2, 3);
  add_edge(4, 5);
  return expect_width("matching6", 1, 6);
}

static int check_complete_bipartite33(void) {
  if (init_rw_dec(6) != 0) {
    fprintf(stderr, "init_rw_dec failed\n");
    return 0;
  }

  clear_graph(6);
  for (unsigned int i = 0; i < 3; i++) {
    for (unsigned int j = 3; j < 6; j++) {
      add_edge(i, j);
    }
  }
  return expect_width("complete_bipartite33", 1, 6);
}

int main(void) {
  if (!check_empty5() || !check_path4() || !check_complete5() ||
      !check_cycle5() || !check_disconnected_matching6() ||
      !check_complete_bipartite33()) {
    return 1;
  }

  puts("rw-ok empty5=0 path4=1 complete5=1 cycle5=2 matching6=1 "
       "complete-bipartite33=1 decompositions");
  return 0;
}
