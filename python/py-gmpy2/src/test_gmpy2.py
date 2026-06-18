import gmpy2


def main():
    n = gmpy2.mpz(2) ** 127 - 1
    assert gmpy2.is_prime(n)
    assert gmpy2.gcd(gmpy2.mpz(756), gmpy2.mpz(210)) == 42
    assert gmpy2.invert(17, 3120) == 2753
    assert str(gmpy2.mpq(355, 113)) == "355/113"

    context = gmpy2.get_context()
    old_precision = context.precision
    context.precision = 80
    try:
        root = gmpy2.sqrt(gmpy2.mpfr(2))
        assert str(root).startswith("1.41421356237309504880")
    finally:
        context.precision = old_precision

    z = gmpy2.mpc(1, 2) * gmpy2.mpc(3, -4)
    assert z.real == 11
    assert z.imag == 2

    print(f"gmpy2-ok version={gmpy2.__version__} prime_bits={n.bit_length()}")


if __name__ == "__main__":
    main()
