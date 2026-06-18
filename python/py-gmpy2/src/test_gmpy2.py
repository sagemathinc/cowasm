import gmpy2


def assert_close(actual, expected, tolerance):
    assert abs(actual - expected) <= tolerance, (actual, expected, tolerance)


def assert_decimal_digits(actual, expected_prefix, expected_exponent):
    digits, exponent, bits = actual.digits(10)
    assert exponent == expected_exponent, (digits, exponent, bits)
    assert digits.startswith(expected_prefix), (digits, expected_prefix, bits)


def check_integer_arithmetic():
    n = gmpy2.mpz(2) ** 127 - 1
    assert gmpy2.is_prime(n)
    assert gmpy2.gcd(gmpy2.mpz(756), gmpy2.mpz(210)) == 42
    assert gmpy2.invert(17, 3120) == 2753
    assert gmpy2.powmod(4, 13, 497) == 445
    assert gmpy2.iroot(gmpy2.mpz(10) ** 60, 3) == (gmpy2.mpz(10) ** 20, True)
    assert gmpy2.is_square(gmpy2.mpz(123456789) ** 2)
    assert gmpy2.bit_mask(10) == 1023
    assert gmpy2.popcount(gmpy2.mpz("123456789abcdef", 16)) == 32
    return n


def check_rational_arithmetic():
    approximation = gmpy2.mpq(355, 113)
    assert str(approximation) == "355/113"
    assert approximation.numerator == 355
    assert approximation.denominator == 113
    assert approximation - 3 == gmpy2.mpq(16, 113)
    assert gmpy2.mpq(6, 35) + gmpy2.mpq(9, 14) == gmpy2.mpq(57, 70)
    assert gmpy2.mpq(-42, 56) == gmpy2.mpq(-3, 4)


def check_real_context():
    context = gmpy2.get_context()
    old_precision = context.precision
    old_round = context.round
    old_trap_underflow = context.trap_underflow
    old_trap_overflow = context.trap_overflow

    context.precision = 80
    context.round = gmpy2.RoundToNearest
    context.trap_underflow = False
    context.trap_overflow = False
    try:
        root = gmpy2.sqrt(gmpy2.mpfr(2))
        assert_close(root * root, gmpy2.mpfr(2), gmpy2.mpfr("1e-22"))
        assert_decimal_digits(root, "141421356237309504880", 1)
        assert format(root, ".20f") == "1.41421356237309504880"

        exp_log = gmpy2.exp(gmpy2.log(gmpy2.mpfr(17)))
        assert_close(exp_log, gmpy2.mpfr(17), gmpy2.mpfr("1e-22"))

        zeta2 = gmpy2.zeta(2)
        assert_close(zeta2, gmpy2.const_pi() ** 2 / 6, gmpy2.mpfr("1e-22"))
        assert_decimal_digits(zeta2, "164493406684822643647", 1)
        assert format(zeta2, ".20f") == "1.64493406684822643647"

        assert format(gmpy2.mpfr("0.1"), ".20f") == "0.10000000000000000000"
        assert format(gmpy2.mpfr("1e-20"), ".20f") == "0.00000000000000000001"
        assert (
            format(gmpy2.mpfr("1e20"), ".5f")
            == "100000000000000000000.00000"
        )

        context.round = gmpy2.RoundDown
        down = gmpy2.mpfr(1) / 10
        context.round = gmpy2.RoundUp
        up = gmpy2.mpfr(1) / 10
        assert down < up
        assert gmpy2.next_above(down) <= up
    finally:
        context.precision = old_precision
        context.round = old_round
        context.trap_underflow = old_trap_underflow
        context.trap_overflow = old_trap_overflow


def check_complex_arithmetic():
    tolerance = gmpy2.mpfr("1e-20")
    context = gmpy2.get_context()
    old_precision = context.precision
    context.precision = 100

    try:
        z = gmpy2.mpc(1, 2) * gmpy2.mpc(3, -4)
        assert z.real == 11
        assert z.imag == 2

        root = gmpy2.sqrt(gmpy2.mpc(-1, 0))
        assert_close(root.real, 0, tolerance)
        assert_close(root.imag, 1, tolerance)

        euler = gmpy2.exp(gmpy2.mpc(0, gmpy2.const_pi()))
        assert_close(euler.real, -1, tolerance)
        assert_close(euler.imag, 0, tolerance)
    finally:
        context.precision = old_precision


def check_c_api_capsule():
    from gmpy2 import gmpy2 as gmpy2_extension

    assert hasattr(gmpy2, "_C_API")
    assert hasattr(gmpy2_extension, "_C_API")


def main():
    n = check_integer_arithmetic()
    check_rational_arithmetic()
    check_real_context()
    check_complex_arithmetic()
    check_c_api_capsule()

    print(
        "gmpy2-ok version=%s prime_bits=%s mpz mpq mpfr mpc c-api"
        % (gmpy2.__version__, n.bit_length())
    )


if __name__ == "__main__":
    main()
