#include <gmp.h>
#include <stdio.h>

#include <cddlib/setoper.h>
#include <cddlib/cdd.h>

static int row_matches(dd_MatrixPtr matrix, long row, long x, long y) {
  return mpq_cmp_si(matrix->matrix[row][0], 1, 1) == 0 &&
         mpq_cmp_si(matrix->matrix[row][1], x, 1) == 0 &&
         mpq_cmp_si(matrix->matrix[row][2], y, 1) == 0;
}

int main(void) {
  dd_ErrorType err = dd_NoError;
  dd_MatrixPtr inequalities = NULL;
  dd_MatrixPtr generators = NULL;
  dd_PolyhedraPtr poly = NULL;
  int saw_vertices[4] = {0, 0, 0, 0};
  int ok = 0;

  dd_set_global_constants();

  inequalities = dd_CreateMatrix(4, 3);
  if (inequalities == NULL) {
    goto done;
  }

  dd_set_si(inequalities->matrix[0][0], 1);
  dd_set_si(inequalities->matrix[0][1], 1);
  dd_set_si(inequalities->matrix[0][2], 0);
  dd_set_si(inequalities->matrix[1][0], 1);
  dd_set_si(inequalities->matrix[1][1], -1);
  dd_set_si(inequalities->matrix[1][2], 0);
  dd_set_si(inequalities->matrix[2][0], 1);
  dd_set_si(inequalities->matrix[2][1], 0);
  dd_set_si(inequalities->matrix[2][2], 1);
  dd_set_si(inequalities->matrix[3][0], 1);
  dd_set_si(inequalities->matrix[3][1], 0);
  dd_set_si(inequalities->matrix[3][2], -1);
  inequalities->representation = dd_Inequality;

  poly = dd_DDMatrix2Poly(inequalities, &err);
  if (err != dd_NoError || poly == NULL) {
    dd_WriteErrorMessages(stdout, err);
    goto done;
  }

  generators = dd_CopyGenerators(poly);
  if (generators == NULL || generators->rowsize != 4 ||
      generators->colsize != 3 || generators->representation != dd_Generator) {
    goto done;
  }

  for (long i = 0; i < generators->rowsize; i++) {
    if (row_matches(generators, i, -1, -1)) {
      saw_vertices[0] = 1;
    } else if (row_matches(generators, i, -1, 1)) {
      saw_vertices[1] = 1;
    } else if (row_matches(generators, i, 1, -1)) {
      saw_vertices[2] = 1;
    } else if (row_matches(generators, i, 1, 1)) {
      saw_vertices[3] = 1;
    }
  }

  ok = saw_vertices[0] && saw_vertices[1] && saw_vertices[2] &&
       saw_vertices[3];
  if (ok) {
    puts("cddlib-ok vertices=4 arithmetic=gmp-rational");
  }

done:
  dd_FreeMatrix(generators);
  dd_FreePolyhedra(poly);
  dd_FreeMatrix(inequalities);
  dd_free_global_constants();
  return ok ? 0 : 1;
}
