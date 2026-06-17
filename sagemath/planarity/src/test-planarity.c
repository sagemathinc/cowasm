#include <planarity/graphLib.h>

#include <stdio.h>

static int add_edge(graphP graph, int u, int v) {
  return gp_DynamicAddEdge(graph, u, 0, v, 0);
}

static int check_cycle5_planar(void) {
  graphP graph = gp_New();
  int result;
  int ok = graph != NULL && gp_InitGraph(graph, 5) == OK;

  ok = ok && add_edge(graph, 1, 2) == OK;
  ok = ok && add_edge(graph, 2, 3) == OK;
  ok = ok && add_edge(graph, 3, 4) == OK;
  ok = ok && add_edge(graph, 4, 5) == OK;
  ok = ok && add_edge(graph, 5, 1) == OK;

  result = ok ? gp_Embed(graph, EMBEDFLAGS_PLANAR) : NOTOK;
  ok = ok && result == OK;

  gp_Free(&graph);
  return ok;
}

static int check_k5_nonplanar(void) {
  graphP graph = gp_New();
  int result;
  int ok = graph != NULL && gp_InitGraph(graph, 5) == OK;

  for (int u = 1; u <= 5 && ok; u++) {
    for (int v = u + 1; v <= 5 && ok; v++) {
      ok = add_edge(graph, u, v) == OK;
    }
  }

  result = ok ? gp_Embed(graph, EMBEDFLAGS_PLANAR) : NOTOK;
  ok = ok && result == NONEMBEDDABLE;

  gp_Free(&graph);
  return ok;
}

static int check_k33_nonplanar(void) {
  graphP graph = gp_New();
  int result;
  int ok = graph != NULL && gp_InitGraph(graph, 6) == OK;

  for (int u = 1; u <= 3 && ok; u++) {
    for (int v = 4; v <= 6 && ok; v++) {
      ok = add_edge(graph, u, v) == OK;
    }
  }

  result = ok ? gp_Embed(graph, EMBEDFLAGS_PLANAR) : NOTOK;
  ok = ok && result == NONEMBEDDABLE;

  gp_Free(&graph);
  return ok;
}

int main(void) {
  int cycle_ok = check_cycle5_planar();
  int k5_ok = check_k5_nonplanar();
  int k33_ok = check_k33_nonplanar();

  if (!cycle_ok) {
    puts("planarity cycle C5 check failed");
  }
  if (!k5_ok) {
    puts("planarity K5 obstruction check failed");
  }
  if (!k33_ok) {
    puts("planarity K3,3 obstruction check failed");
  }

  if (cycle_ok && k5_ok && k33_ok) {
    puts("planarity-ok cycle5=planar k5=nonplanar k33=nonplanar");
  }

  return cycle_ok && k5_ok && k33_ok ? 0 : 1;
}
