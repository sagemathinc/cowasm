#include <stdio.h>

#include "meataxe.h"

static int set_entry(Matrix_t *matrix, int row, int col, int value) {
  FfSetField(matrix->Field);
  FfSetNoc(matrix->Noc);
  FfInsert(MatGetPtr(matrix, row), col, FfFromInt(value));
  return 0;
}

static int get_entry(Matrix_t *matrix, int row, int col) {
  FfSetField(matrix->Field);
  FfSetNoc(matrix->Noc);
  return FfToInt(FfExtract(MatGetPtr(matrix, row), col));
}

static Matrix_t *make_left_matrix(void) {
  Matrix_t *matrix = MatAlloc(3, 2, 2);
  if (matrix == NULL) {
    return NULL;
  }
  set_entry(matrix, 0, 0, 1);
  set_entry(matrix, 0, 1, 2);
  set_entry(matrix, 1, 0, 0);
  set_entry(matrix, 1, 1, 1);
  return matrix;
}

static Matrix_t *make_right_matrix(void) {
  Matrix_t *matrix = MatAlloc(3, 2, 2);
  if (matrix == NULL) {
    return NULL;
  }
  set_entry(matrix, 0, 0, 2);
  set_entry(matrix, 0, 1, 1);
  set_entry(matrix, 1, 0, 1);
  set_entry(matrix, 1, 1, 2);
  return matrix;
}

int main(int argc, char **argv) {
  if (MtxInitLibrary() < 0) {
    return 1;
  }

  Matrix_t *a = make_left_matrix();
  Matrix_t *b = make_right_matrix();
  if (a == NULL || b == NULL) {
    return 2;
  }

  if (argc == 3) {
    int ok = MatSave(a, argv[1]) == 0 && MatSave(b, argv[2]) == 0;
    MatFree(b);
    MatFree(a);
    MtxCleanupLibrary();
    if (ok) {
      printf("meataxe-files-ok left=%s right=%s\n", argv[1], argv[2]);
    }
    return ok ? 0 : 3;
  }

  if (argc != 1) {
    MatFree(b);
    MatFree(a);
    MtxCleanupLibrary();
    return 4;
  }

  Matrix_t *product = MatDup(a);
  if (product == NULL || MatMul(product, b) == NULL) {
    return 3;
  }

  int p00 = get_entry(product, 0, 0);
  int p01 = get_entry(product, 0, 1);
  int p10 = get_entry(product, 1, 0);
  int p11 = get_entry(product, 1, 1);
  int trace = FfToInt(MatTrace(product));
  long nullity = MatNullity(product);

  MatFree(product);
  MatFree(b);
  MatFree(a);
  MtxCleanupLibrary();

  printf("meataxe-ok product=%d%d%d%d trace=%d nullity=%ld\n",
         p00, p01, p10, p11, trace, nullity);
  return !(p00 == 1 && p01 == 2 && p10 == 1 && p11 == 2 &&
           trace == 0 && nullity == 1);
}
