#include <gmp.h>
#include <stdio.h>
#include <string.h>

int main(void) {
    mpz_t value;
    char actual[80];
    const char *expected =
        "1606938044258990275541962092341162602522202993782792835301376";

    mpz_init(value);
    mpz_ui_pow_ui(value, 2, 200);
    mpz_get_str(actual, 10, value);
    mpz_clear(value);

    puts(actual);
    return strcmp(actual, expected) == 0 ? 0 : 1;
}
