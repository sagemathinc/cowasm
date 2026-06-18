import fib
import nt
import numbers


def main():
    assert fib.fib(10) == 89
    assert nt.gcd(92250, 922350) == 150
    assert nt.xgcd(240, 46) == (2, -9, 47)
    assert nt.inverse_mod(17, 3120) == 2753
    try:
        nt.inverse_mod(6, 15)
    except ZeroDivisionError:
        pass
    else:
        raise AssertionError("inverse_mod should reject non-units")

    assert nt.pi(1000) == 168
    assert numbers.cimport_smoke() == (150, 2, -9, 47, 2753, 5)

    print("cython-wasi-ok fib gcd xgcd inverse_mod exceptions cimported-number-theory")


if __name__ == "__main__":
    main()
