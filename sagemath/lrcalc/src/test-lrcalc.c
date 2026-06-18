#include <stdio.h>

#include <lrcalc/alloc.h>
#include <lrcalc/ivector.h>
#include <lrcalc/ivlincomb.h>
#include <lrcalc/part.h>
#include <lrcalc/schur.h>

static void set_partition(ivector *partition, int a, int b, int c) {
  iv_elem(partition, 0) = a;
  iv_elem(partition, 1) = b;
  iv_elem(partition, 2) = c;
}

static int expect_lc_term(ivlincomb *lc, int value, int a, int b, int c) {
  ivector *partition = iv_new(3);
  ivlc_keyval_t *term = NULL;
  int ok = 0;

  if (partition == NULL) {
    return 0;
  }

  set_partition(partition, a, b, c);
  term = ivlc_lookup(lc, partition, iv_hash(partition));
  ok = term != NULL && term->value == value;
  iv_free(partition);
  return ok;
}

static void fail(const char *message) {
  fprintf(stderr, "lrcalc-fail %s\n", message);
}

int main(void) {
  int ok = 0;
  ivector *outer = NULL;
  ivector *left = NULL;
  ivector *right = NULL;
  ivlincomb *fusion = NULL;
  ivlincomb *skew = NULL;

  alloc_getenv();

  outer = iv_new(3);
  left = iv_new(3);
  right = iv_new(3);
  if (outer == NULL || left == NULL || right == NULL) {
    fail("alloc");
    goto done;
  }

  set_partition(outer, 3, 2, 1);
  set_partition(left, 2, 1, 0);
  set_partition(right, 2, 1, 0);

  if (schur_lrcoef(outer, left, right) != 2) {
    fail("lrcoef-321");
    goto done;
  }

  set_partition(outer, 4, 2, 0);
  if (schur_lrcoef(outer, left, right) != 1) {
    fail("lrcoef-420");
    goto done;
  }

  set_partition(outer, 3, 2, 1);
  part_chop(left);
  skew = schur_skew(outer, left, -1, -1);
  if (skew == NULL || ivlc_card(skew) != 3 ||
      !expect_lc_term(skew, 2, 2, 1, 0) ||
      !expect_lc_term(skew, 1, 1, 1, 1) ||
      !expect_lc_term(skew, 1, 3, 0, 0)) {
    fail("skew");
    goto done;
  }

  fusion = schur_mult_fusion(outer, outer, 3, 2);
  if (fusion == NULL || ivlc_card(fusion) != 2 ||
      !expect_lc_term(fusion, 1, 4, 4, 4) ||
      !expect_lc_term(fusion, 1, 5, 4, 3)) {
    fail("fusion");
    goto done;
  }

  puts("lrcalc-ok lrcoef-321=2 lrcoef-420=1 skew-terms=3 fusion-terms=2");
  ok = 1;

done:
  if (fusion != NULL) {
    ivlc_free_all(fusion);
  }
  if (skew != NULL) {
    ivlc_free_all(skew);
  }
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
