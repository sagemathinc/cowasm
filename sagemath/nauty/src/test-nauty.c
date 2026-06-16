#define MAXN 16
#include "nauty.h"

#include <stdio.h>

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
    return 0;
  }

  fprintf(stderr,
          "unexpected nauty result: grpsize=%g*10^%d same_orbit=%d\n",
          stats.grpsize1, stats.grpsize2, same_orbit);
  return 1;
}
