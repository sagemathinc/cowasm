#include <mcqd/mcqd.h>

#include <cstdio>

int main() {
  static bool edges[5][5] = {};
  const bool *conn[5];

  for (int i = 0; i < 5; i++) {
    conn[i] = edges[i];
  }

  edges[0][1] = edges[1][0] = true;
  edges[0][2] = edges[2][0] = true;
  edges[1][2] = edges[2][1] = true;
  edges[2][3] = edges[3][2] = true;
  edges[3][4] = edges[4][3] = true;

  Maxclique mcq(conn, 5);
  int *clique = nullptr;
  int size = 0;
  mcq.mcq(clique, size);

  int contains0 = 0;
  int contains1 = 0;
  int contains2 = 0;
  for (int i = 0; i < size; i++) {
    contains0 |= clique[i] == 0;
    contains1 |= clique[i] == 1;
    contains2 |= clique[i] == 2;
  }

  bool ok = size == 3 && contains0 && contains1 && contains2;
  delete[] clique;

  if (!ok) {
    std::fprintf(stderr, "unexpected MCQD clique result: size=%d\n", size);
    return 1;
  }

  Maxclique mcqdyn(conn, 5);
  clique = nullptr;
  size = 0;
  mcqdyn.mcqdyn(clique, size);

  contains0 = 0;
  contains1 = 0;
  contains2 = 0;
  for (int i = 0; i < size; i++) {
    contains0 |= clique[i] == 0;
    contains1 |= clique[i] == 1;
    contains2 |= clique[i] == 2;
  }

  ok = size == 3 && contains0 && contains1 && contains2;
  delete[] clique;

  if (!ok) {
    std::fprintf(stderr, "unexpected MCQD dynamic clique result: size=%d\n",
                 size);
    return 1;
  }

  std::printf("mcqd-ok max=%d clique=%d%d%d steps=%d dyn-steps=%d\n", size,
              contains0, contains1, contains2, mcq.steps(), mcqdyn.steps());
  return 0;
}
