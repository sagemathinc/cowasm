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

static int check_linear_algebra(Matrix_t *a, Matrix_t *product, int *order,
                                long *rank, long *nullity) {
  int ok = 0;
  Matrix_t *inverse = MatInverse(a);
  Matrix_t *identity = MatId(3, 2);
  Matrix_t *unit = MatDup(a);
  Matrix_t *echelon = MatDup(product);
  Matrix_t *nullspace = MatNullSpace(product);
  Matrix_t *zero_check = NULL;

  if (inverse == NULL || identity == NULL || unit == NULL || echelon == NULL ||
      nullspace == NULL) {
    goto cleanup;
  }

  *order = MatOrder(a);
  if (MatMul(unit, inverse) == NULL || MatCompare(unit, identity) != 0) {
    goto cleanup;
  }

  *rank = MatEchelonize(echelon);
  *nullity = MatNullity(product);
  zero_check = MatDup(nullspace);
  if (zero_check == NULL || MatMul(zero_check, product) == NULL) {
    goto cleanup;
  }

  ok = *order == 3 && *rank == 1 && echelon->Nor == 1 && *nullity == 1 &&
       nullspace->Nor == 1 && nullspace->Noc == 2 &&
       get_entry(zero_check, 0, 0) == 0 && get_entry(zero_check, 0, 1) == 0;

cleanup:
  if (zero_check != NULL) {
    MatFree(zero_check);
  }
  if (nullspace != NULL) {
    MatFree(nullspace);
  }
  if (echelon != NULL) {
    MatFree(echelon);
  }
  if (unit != NULL) {
    MatFree(unit);
  }
  if (identity != NULL) {
    MatFree(identity);
  }
  if (inverse != NULL) {
    MatFree(inverse);
  }
  return ok;
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
  int order = -1;
  long rank = -1;
  long nullity = -1;
  int algebra_ok = check_linear_algebra(a, product, &order, &rank, &nullity);

  MatFree(product);
  MatFree(b);
  MatFree(a);
  MtxCleanupLibrary();

  printf("meataxe-ok product=%d%d%d%d trace=%d order=%d rank=%ld nullity=%ld\n",
         p00, p01, p10, p11, trace, order, rank, nullity);
  return !(p00 == 1 && p01 == 2 && p10 == 1 && p11 == 2 &&
           trace == 0 && algebra_ok);
}
