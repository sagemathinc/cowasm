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

static int expect_width(const char *name, uint_fast8_t expected) {
  calculate_all();

  uint_fast8_t width = get_rw();
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
  return expect_width("empty5", 0);
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
  return expect_width("path4", 1);
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
  return expect_width("complete5", 1);
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
  return expect_width("cycle5", 2);
}

int main(void) {
  if (!check_empty5() || !check_path4() || !check_complete5() ||
      !check_cycle5()) {
    return 1;
  }

  puts("rw-ok empty5=0 path4=1 complete5=1 cycle5=2");
  return 0;
}
