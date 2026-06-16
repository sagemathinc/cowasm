#include <mpfi.h>
#include <mpfr.h>

#include <stdio.h>
#include <string.h>

static int mpfr_eq_ui(mpfr_srcptr value, unsigned long expected) {
  return mpfr_cmp_ui(value, expected) == 0;
}

static int mpfi_bounds_eq_ui(mpfi_srcptr value, unsigned long expected_left,
                             unsigned long expected_right) {
  mpfr_t left;
  mpfr_t right;
  int ok;

  mpfr_init2(left, mpfi_get_prec(value));
  mpfr_init2(right, mpfi_get_prec(value));
  mpfi_get_left(left, value);
  mpfi_get_right(right, value);

  ok = mpfr_eq_ui(left, expected_left) && mpfr_eq_ui(right, expected_right);

  mpfr_clear(right);
  mpfr_clear(left);
  return ok;
}

int main(void) {
  mpfi_t interval;
  mpfi_t root;
  mpfi_t a;
  mpfi_t b;
  mpfi_t sum;
  mpfi_t product;
  mpfi_t intersection;
  mpfi_t hull;
  mpfi_t half_left;
  mpfi_t half_right;
  mpfr_t left;
  mpfr_t right;
  mpfr_t midpoint;
  mpfr_t diameter;
  char left_s[16];
  char right_s[16];
  char midpoint_s[16];
  int ok;

  mpfi_init2(interval, 128);
  mpfi_init2(root, 128);
  mpfi_init2(a, 128);
  mpfi_init2(b, 128);
  mpfi_init2(sum, 128);
  mpfi_init2(product, 128);
  mpfi_init2(intersection, 128);
  mpfi_init2(hull, 128);
  mpfi_init2(half_left, 128);
  mpfi_init2(half_right, 128);
  mpfr_init2(left, 128);
  mpfr_init2(right, 128);
  mpfr_init2(midpoint, 128);
  mpfr_init2(diameter, 128);

  mpfi_interv_ui(interval, 1, 4);
  mpfi_sqrt(root, interval);
  mpfi_get_left(left, root);
  mpfi_get_right(right, root);
  mpfi_mid(midpoint, root);
  mpfr_snprintf(left_s, sizeof(left_s), "%.1RNf", left);
  mpfr_snprintf(right_s, sizeof(right_s), "%.1RNf", right);
  mpfr_snprintf(midpoint_s, sizeof(midpoint_s), "%.1RNf", midpoint);

  printf("mpfi-ok sqrt([1,4])=[%s,%s] midpoint=%s\n", left_s, right_s,
         midpoint_s);

  ok = mpfr_eq_ui(left, 1) && mpfr_eq_ui(right, 2);
  ok = ok && strcmp(left_s, "1.0") == 0 && strcmp(right_s, "2.0") == 0;
  ok = ok && mpfr_cmp_ui(midpoint, 1) > 0 && mpfr_cmp_ui(midpoint, 2) < 0;
  ok = ok && mpfi_is_inside_ui(1, root) && mpfi_is_inside_ui(2, root);
  ok = ok && !mpfi_has_zero(root);

  mpfi_interv_ui(a, 1, 3);
  mpfi_interv_ui(b, 2, 5);
  mpfi_add(sum, a, b);
  mpfi_mul(product, a, b);
  mpfi_intersect(intersection, a, b);
  mpfi_union(hull, a, b);
  mpfi_diam_abs(diameter, hull);
  mpfi_bisect(half_left, half_right, hull);

  ok = ok && mpfi_bounds_eq_ui(sum, 3, 8);
  ok = ok && mpfi_bounds_eq_ui(product, 2, 15);
  ok = ok && mpfi_bounds_eq_ui(intersection, 2, 3);
  ok = ok && mpfi_bounds_eq_ui(hull, 1, 5);
  ok = ok && mpfr_eq_ui(diameter, 4);
  ok = ok && mpfi_bounds_eq_ui(half_left, 1, 3);
  ok = ok && mpfi_bounds_eq_ui(half_right, 3, 5);
  ok = ok && mpfi_is_inside(intersection, hull);
  ok = ok && mpfi_is_strictly_inside(intersection, hull);

  if (ok)
    puts("mpfi-ok interval-arithmetic sum=[3,8] product=[2,15] "
         "intersection=[2,3] hull=[1,5] bisect=[1,3]|[3,5]");

  mpfr_clear(diameter);
  mpfr_clear(midpoint);
  mpfr_clear(right);
  mpfr_clear(left);
  mpfi_clear(half_right);
  mpfi_clear(half_left);
  mpfi_clear(hull);
  mpfi_clear(intersection);
  mpfi_clear(product);
  mpfi_clear(sum);
  mpfi_clear(b);
  mpfi_clear(a);
  mpfi_clear(root);
  mpfi_clear(interval);
  mpfr_free_cache();

  return ok ? 0 : 1;
}
