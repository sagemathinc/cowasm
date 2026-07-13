#include <mpfr.h>

static int parsed_integer_matches(mpfr_t x, const char *input, int base,
                                  long expected) {
  return mpfr_set_str(x, input, base, MPFR_RNDN) == 0 &&
         mpfr_cmp_si(x, expected) == 0;
}

__attribute__((visibility("default")))
int mpfr_side_parse_state(void) {
  mpfr_t x;
  int status = 0;

  mpfr_init2(x, 128);

  if (mpfr_set_str(x, "0x123.e1", 0, MPFR_RNDN) != 0 ||
      mpfr_cmp_d(x, 291.87890625) != 0) {
    status = 1;
  } else if (!parsed_integer_matches(x, "0x123.@1", 0, 4656)) {
    status = 2;
  } else if (!parsed_integer_matches(x, "1Xx", 36, 2517)) {
    status = 3;
  } else if (mpfr_set_str(x, "-1Xx@-10", 62, MPFR_RNDN) != 0 ||
             mpfr_sgn(x) >= 0) {
    status = 4;
  } else if (!parsed_integer_matches(x, "-1", 10, -1)) {
    status = 5;
  } else if (mpfr_set_str(x, "-0", 10, MPFR_RNDN) != 0 ||
             !mpfr_zero_p(x) || !mpfr_signbit(x)) {
    status = 6;
  } else if (!parsed_integer_matches(x, "-100", 10, -100)) {
    status = 7;
  } else if (!parsed_integer_matches(x, "12", 16, 18)) {
    status = 8;
  } else if (!parsed_integer_matches(x, "aaa", 37, 50652)) {
    status = 9;
  }

  mpfr_clear(x);
  return status;
}
