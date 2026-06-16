#include <stdio.h>

#include <lrcalc/alloc.h>
#include <lrcalc/ivector.h>
#include <lrcalc/ivlincomb.h>
#include <lrcalc/schur.h>

static void set_partition(ivector *partition, int a, int b, int c) {
  iv_elem(partition, 0) = a;
  iv_elem(partition, 1) = b;
  iv_elem(partition, 2) = c;
}

int main(void) {
  int ok = 0;
  ivector *outer = NULL;
  ivector *left = NULL;
  ivector *right = NULL;

  alloc_getenv();

  outer = iv_new(3);
  left = iv_new(3);
  right = iv_new(3);
  if (outer == NULL || left == NULL || right == NULL) {
    goto done;
  }

  set_partition(outer, 3, 2, 1);
  set_partition(left, 2, 1, 0);
  set_partition(right, 2, 1, 0);

  if (schur_lrcoef(outer, left, right) != 2) {
    goto done;
  }

  set_partition(outer, 4, 2, 0);
  if (schur_lrcoef(outer, left, right) != 1) {
    goto done;
  }

  puts("lrcalc-ok lrcoef-321=2 lrcoef-420=1");
  ok = 1;

done:
  if (outer != NULL) {
    iv_free(outer);
  }
  if (left != NULL) {
    iv_free(left);
  }
  if (right != NULL) {
    iv_free(right);
  }
  return ok ? 0 : 1;
}
