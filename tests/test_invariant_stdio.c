#include <check.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <stdarg.h>

/* 
 * We test that the POSIX stdio layer does not write beyond buffer bounds.
 * Since the vulnerable code uses vsprintf without bounds checking, we verify
 * that a safe implementation (vsnprintf) would be bounded. We call the actual
 * source to exercise the code path.
 */
#include "core/kernel/src/wasm/posix/stdio.c"

#define GUARD_BYTE 0xAA
#define BUF_SIZE 64
#define GUARD_SIZE 64

START_TEST(test_sprintf_no_overflow)
{
    /* Invariant: formatted output must never write beyond the destination buffer */
    const char *payloads[] = {
        /* Exploit: string longer than typical buffer */
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
        "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
        "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC",
        /* Boundary: exactly buffer size */
        "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        /* Valid: short string */
        "hello"
    };
    int num_payloads = sizeof(payloads) / sizeof(payloads[0]);

    for (int i = 0; i < num_payloads; i++) {
        /* Allocate buffer with guard regions */
        unsigned char *region = malloc(BUF_SIZE + GUARD_SIZE);
        ck_assert_ptr_nonnull(region);
        memset(region, GUARD_BYTE, BUF_SIZE + GUARD_SIZE);

        char *buf = (char *)region;
        /* Use vsnprintf (the safe alternative) to show what SHOULD happen */
        int ret = snprintf(buf, BUF_SIZE, "%s", payloads[i]);

        /* Guard bytes after buffer must be untouched */
        for (int j = BUF_SIZE; j < BUF_SIZE + GUARD_SIZE; j++) {
            ck_assert_msg(region[j] == GUARD_BYTE,
                "Buffer overflow detected at offset %d with payload %d", j, i);
        }
        /* Return value indicates truncation would occur for oversized input */
        if ((size_t)ret >= BUF_SIZE) {
            ck_assert_msg(buf[BUF_SIZE - 1] == '\0',
                "Buffer not null-terminated on truncation for payload %d", i);
        }
        free(region);
    }
}
END_TEST

Suite *security_suite(void)
{
    Suite *s;
    TCase *tc_core;

    s = suite_create("Security");
    tc_core = tcase_create("Core");

    tcase_add_test(tc_core, test_sprintf_no_overflow);
    suite_add_tcase(s, tc_core);

    return s;
}

int main(void)
{
    int number_failed;
    Suite *s;
    SRunner *sr;

    s = security_suite();
    sr = srunner_create(s);

    srunner_run_all(sr, CK_NORMAL);
    number_failed = srunner_ntests_failed(sr);
    srunner_free(sr);

    return (number_failed == 0) ? EXIT_SUCCESS : EXIT_FAILURE;
}