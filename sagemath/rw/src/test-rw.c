#include <rw.h>

#include <stdint.h>
#include <stdio.h>

static subset_t bit(unsigned int i) { return ((subset_t)1u) << i; }

static void add_edge(unsigned int i, unsigned int j) {
  adjacency_matrix[i] |= bit(j);
  adjacency_matrix[j] |= bit(i);
}

int main(void) {
  if (init_rw_dec(4) != 0) {
    fprintf(stderr, "init_rw_dec failed\n");
    return 1;
  }

  add_edge(0, 1);
  add_edge(1, 2);
  add_edge(2, 3);
  calculate_all();

  uint_fast8_t width = get_rw();
  destroy_rw();

  if (width != 1) {
    fprintf(stderr, "unexpected rank-width: %u\n", (unsigned)width);
    return 1;
  }

  printf("rw-ok path4-width=%u\n", (unsigned)width);
  return 0;
}
