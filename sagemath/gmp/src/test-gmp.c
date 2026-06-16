#include <gmp.h>
#include <stdio.h>
#include <string.h>

int main(void) {
    mpz_t value;
    mpz_t gcd;
    mpz_t inverse;
    mpz_t residue;
    mpq_t one_third;
    mpq_t one_sixth;
    mpq_t rational_sum;
    char integer_actual[80];
    char rational_actual[16];
    const char *integer_expected =
        "1606938044258990275541962092341162602522202993782792835301376";

    mpz_init(value);
    mpz_init(gcd);
    mpz_init(inverse);
    mpz_init(residue);
    mpq_init(one_third);
    mpq_init(one_sixth);
    mpq_init(rational_sum);

    mpz_ui_pow_ui(value, 2, 200);
    mpz_get_str(integer_actual, 10, value);
    mpz_gcd_ui(gcd, value, 63);
    mpz_set_ui(value, 17);
    mpz_set_ui(residue, 3120);
    mpz_invert(inverse, value, residue);
    mpz_set_ui(value, 4);
    mpz_set_ui(residue, 497);
    mpz_powm_ui(value, value, 13, residue);

    mpq_set_si(one_third, 1, 3);
    mpq_set_si(one_sixth, 1, 6);
    mpq_add(rational_sum, one_third, one_sixth);
    mpq_get_str(rational_actual, 10, rational_sum);

    if (strcmp(integer_actual, integer_expected) != 0 ||
        strcmp(rational_actual, "1/2") != 0 ||
        mpz_cmp_ui(gcd, 1) != 0 ||
        mpz_cmp_ui(inverse, 2753) != 0 ||
        mpz_cmp_ui(value, 445) != 0) {
        return 1;
    }

    printf("gmp-ok integer=2^200 rational=%s gcd=1 inverse=2753 powm=445\n",
           rational_actual);

    mpq_clear(rational_sum);
    mpq_clear(one_sixth);
    mpq_clear(one_third);
    mpz_clear(residue);
    mpz_clear(inverse);
    mpz_clear(gcd);
    mpz_clear(value);

    return 0;
}
