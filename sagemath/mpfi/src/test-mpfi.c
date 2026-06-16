#include <mpfi.h>
#include <mpfr.h>

#include <stdio.h>
#include <string.h>

static int mpfr_eq_ui(mpfr_srcptr value, unsigned long expected) {
  return mpfr_cmp_ui(value, expected) == 0;
}

int main(void) {
  mpfi_t interval;
  mpfi_t root;
  mpfr_t left;
  mpfr_t right;
  mpfr_t midpoint;
  char left_s[16];
  char right_s[16];
  char midpoint_s[16];
  int ok;

  mpfi_init2(interval, 128);
  mpfi_init2(root, 128);
  mpfr_init2(left, 128);
  mpfr_init2(right, 128);
  mpfr_init2(midpoint, 128);

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

  mpfr_clear(midpoint);
  mpfr_clear(right);
  mpfr_clear(left);
  mpfi_clear(root);
  mpfi_clear(interval);
  mpfr_free_cache();

  return ok ? 0 : 1;
}
