#include <stdio.h>
#include <libqhull_r/libqhull_r.h>

static int run_square_hull(void) {
  coordT points[] = {
      0.0, 0.0,
      1.0, 0.0,
      1.0, 1.0,
      0.0, 1.0,
  };
  char qhull_cmd[] = "qhull Qt";
  qhT qh_qh;
  qhT *qh = &qh_qh;
  facetT *facet;
  vertexT *vertex;
  int facet_count = 0;
  int vertex_count = 0;
  int curlong = 0;
  int totlong = 0;
  int exitcode;

  qh_zero(qh, stderr);
  exitcode = qh_new_qhull(
      qh, 2, 4, points, False, qhull_cmd, stdout, stderr);
  if (exitcode != qh_ERRnone) {
    fprintf(stderr, "qhull: qh_new_qhull failed with status %d\n", exitcode);
    qh_freeqhull(qh, !qh_ALL);
    qh_memfreeshort(qh, &curlong, &totlong);
    return 1;
  }

  FORALLfacets {
    facet_count++;
  }
  FORALLvertices {
    vertex_count++;
  }

  if (qh->num_facets != 4 || facet_count != 4) {
    fprintf(
        stderr,
        "qhull: expected 4 square facets, got num_facets=%d counted=%d\n",
        qh->num_facets,
        facet_count);
    qh_freeqhull(qh, !qh_ALL);
    qh_memfreeshort(qh, &curlong, &totlong);
    return 1;
  }

  if (qh->num_vertices != 4 || vertex_count != 4) {
    fprintf(
        stderr,
        "qhull: expected 4 square vertices, got num_vertices=%d counted=%d\n",
        qh->num_vertices,
        vertex_count);
    qh_freeqhull(qh, !qh_ALL);
    qh_memfreeshort(qh, &curlong, &totlong);
    return 1;
  }

  qh_freeqhull(qh, !qh_ALL);
  qh_memfreeshort(qh, &curlong, &totlong);
  if (curlong || totlong) {
    fprintf(
        stderr,
        "qhull: memory cleanup left curlong=%d totlong=%d\n",
        curlong,
        totlong);
    return 1;
  }

  printf("qhull-ok square facets=%d vertices=%d\n", facet_count, vertex_count);
  return 0;
}

int main(void) {
  return run_square_hull();
}
