#include <stdio.h>

#include <cddlib/setoper.h>
#include <cddlib/cdd.h>

static int row_matches(dd_MatrixPtr matrix, long row, long b, long x, long y) {
  mytype expected[3];
  int matches = 0;

  for (int i = 0; i < 3; i++) {
    dd_init(expected[i]);
  }

  dd_set_si(expected[0], b);
  dd_set_si(expected[1], x);
  dd_set_si(expected[2], y);

  matches = dd_cmp(matrix->matrix[row][0], expected[0]) == 0 &&
            dd_cmp(matrix->matrix[row][1], expected[1]) == 0 &&
            dd_cmp(matrix->matrix[row][2], expected[2]) == 0;

  for (int i = 0; i < 3; i++) {
    dd_clear(expected[i]);
  }

  return matches;
}

static int matrix_has_row(dd_MatrixPtr matrix, long b, long x, long y) {
  for (long row = 0; row < matrix->rowsize; row++) {
    if (row_matches(matrix, row, b, x, y)) {
      return 1;
    }
  }

  return 0;
}

static int check_h_to_v(void) {
  dd_ErrorType err = dd_NoError;
  dd_MatrixPtr inequalities = NULL;
  dd_MatrixPtr generators = NULL;
  dd_PolyhedraPtr poly = NULL;
  int ok = 0;

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

  ok = matrix_has_row(generators, 1, -1, -1) &&
       matrix_has_row(generators, 1, -1, 1) &&
       matrix_has_row(generators, 1, 1, -1) &&
       matrix_has_row(generators, 1, 1, 1);

done:
  dd_FreeMatrix(generators);
  dd_FreePolyhedra(poly);
  dd_FreeMatrix(inequalities);
  return ok;
}

static int check_v_to_h(void) {
  dd_ErrorType err = dd_NoError;
  dd_MatrixPtr generators = NULL;
  dd_MatrixPtr inequalities = NULL;
  dd_PolyhedraPtr poly = NULL;
  int ok = 0;

  generators = dd_CreateMatrix(4, 3);
  if (generators == NULL) {
    goto done;
  }

  dd_set_si(generators->matrix[0][0], 1);
  dd_set_si(generators->matrix[0][1], -1);
  dd_set_si(generators->matrix[0][2], -1);
  dd_set_si(generators->matrix[1][0], 1);
  dd_set_si(generators->matrix[1][1], -1);
  dd_set_si(generators->matrix[1][2], 1);
  dd_set_si(generators->matrix[2][0], 1);
  dd_set_si(generators->matrix[2][1], 1);
  dd_set_si(generators->matrix[2][2], -1);
  dd_set_si(generators->matrix[3][0], 1);
  dd_set_si(generators->matrix[3][1], 1);
  dd_set_si(generators->matrix[3][2], 1);
  generators->representation = dd_Generator;

  poly = dd_DDMatrix2Poly(generators, &err);
  if (err != dd_NoError || poly == NULL) {
    dd_WriteErrorMessages(stdout, err);
    goto done;
  }

  inequalities = dd_CopyInequalities(poly);
  if (inequalities == NULL || inequalities->rowsize != 4 ||
      inequalities->colsize != 3 ||
      inequalities->representation != dd_Inequality) {
    goto done;
  }

  ok = matrix_has_row(inequalities, 1, -1, 0) &&
       matrix_has_row(inequalities, 1, 1, 0) &&
       matrix_has_row(inequalities, 1, 0, -1) &&
       matrix_has_row(inequalities, 1, 0, 1);

done:
  dd_FreeMatrix(inequalities);
  dd_FreePolyhedra(poly);
  dd_FreeMatrix(generators);
  return ok;
}

int main(void) {
  int h_to_v = 0;
  int v_to_h = 0;

  dd_set_global_constants();

  h_to_v = check_h_to_v();
  v_to_h = check_v_to_h();

  if (h_to_v && v_to_h) {
    printf("cddlib-ok h-to-v=4 v-to-h=4 arithmetic=%s\n", dd_ARITHMETIC);
  }

  dd_free_global_constants();
  return h_to_v && v_to_h ? 0 : 1;
}
