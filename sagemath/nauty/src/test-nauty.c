#define MAXN 16
#include "nauty.h"
#include "traces.h"

#include <stdio.h>

static int check_traces_cycle(void) {
  static DEFAULTOPTIONS_TRACES(options);
  TracesStats stats;
  SG_DECL(sg);
  SG_DECL(canon);
  int lab[MAXN];
  int ptn[MAXN];
  int orbits[MAXN];
  int same_orbit;

  options.getcanon = TRUE;

  SG_ALLOC(sg, 5, 10, "malloc");
  sg.nv = 5;
  sg.nde = 10;
  for (int v = 0; v < sg.nv; v++) {
    sg.v[v] = 2 * (size_t)v;
    sg.d[v] = 2;
    sg.e[sg.v[v]] = (v + 1) % sg.nv;
    sg.e[sg.v[v] + 1] = (v + sg.nv - 1) % sg.nv;
  }

  Traces(&sg, lab, ptn, orbits, &options, &stats, &canon);

  same_orbit = 1;
  for (int v = 1; v < sg.nv; v++) {
    same_orbit = same_orbit && orbits[v] == orbits[0];
  }

  SG_FREE(sg);
  SG_FREE(canon);

  if (stats.grpsize1 == 10.0 && stats.grpsize2 == 0 &&
      stats.numorbits == 1 && same_orbit) {
    puts("nauty-ok traces cycle=5 automorphisms=10 orbit=transitive");
    return 0;
  }

  fprintf(stderr,
          "unexpected Traces result: grpsize=%g*10^%d orbits=%d "
          "same_orbit=%d\n",
          stats.grpsize1, stats.grpsize2, stats.numorbits, same_orbit);
  return 1;
}

int main(void) {
  graph g[MAXN * MAXM];
  int lab[MAXN];
  int ptn[MAXN];
  int orbits[MAXN];
  static DEFAULTOPTIONS_GRAPH(options);
  statsblk stats;
  int m;
  int n;
  int v;
  int same_orbit;

  n = 5;
  m = SETWORDSNEEDED(n);
  nauty_check(WORDSIZE, m, n, NAUTYVERSIONID);

  EMPTYGRAPH(g, m, n);
  for (v = 0; v < n; v++) {
    ADDONEEDGE(g, v, (v + 1) % n, m);
  }

  densenauty(g, lab, ptn, orbits, &options, &stats, m, n, NULL);

  same_orbit = 1;
  for (v = 1; v < n; v++) {
    same_orbit = same_orbit && orbits[v] == orbits[0];
  }

  if (stats.grpsize1 == 10.0 && stats.grpsize2 == 0 && same_orbit) {
    puts("nauty-ok cycle=5 automorphisms=10 orbit=transitive");
    return check_traces_cycle();
  }

  fprintf(stderr,
          "unexpected nauty result: grpsize=%g*10^%d same_orbit=%d\n",
          stats.grpsize1, stats.grpsize2, same_orbit);
  return 1;
}
